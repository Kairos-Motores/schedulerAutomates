/* -------------------------------------------------------------------------
 * COMPONENTE: AutomationScheduler.jsx
 * ------------------------------------------------------------------------- */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '../Header/Header';
import { TimeWheel } from './TimeWheel';
import styles from './AutomationScheduler.module.scss';
import { HistoryView } from '../HistoryView/HistoryView';
import { SettingsModal } from '../SettingsModal/SettingsModal';
import { RepositoryView } from '../RepositoryView/RepositoryView';

// 📌 API rodando localmente na porta 8000
const API_BASE_URL = 'https://eggshell-jaybird-hate.ngrok-free.dev';

const DAYS_LIST = [
  { label: 'Dom', key: 'sun' },
  { label: 'Seg', key: 'mon' },
  { label: 'Ter', key: 'tue' },
  { label: 'Qua', key: 'wed' },
  { label: 'Qui', key: 'thu' },
  { label: 'Sex', key: 'fri' },
  { label: 'Sáb', key: 'sat' },
];

const HOURS_ARRAY = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_ARRAY = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

// 💡 Função auxiliar para extrair o nome do arquivo sem extensão a partir do caminho
const getFileNameWithoutExtension = (filePath) => {
  if (!filePath) return '';
  const fileName = filePath.split(/[/\\]/).pop();
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
};

export const AutomationScheduler = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [activeMenu, setActiveMenu] = useState('Automacoes');
  const [tasks, setTasks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [savedFolders, setSavedFolders] = useState([]);

  // ⚙️ Estado do Modal de Configurações
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fileInputRef = useRef(null);

  // 📂 Carregar pastas configuradas no localStorage
  const loadSavedFolders = useCallback(() => {
    const saved = localStorage.getItem('automation_folders');
    if (saved) {
      try {
        setSavedFolders(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao ler pastas salvas:', e);
      }
    } else {
      setSavedFolders([
        { id: '1', folderName: 'pasta_programa1', mainScript: 'main.py' },
        { id: '2', folderName: 'pasta_programa2', mainScript: 'bot_runner.py' },
      ]);
    }
  }, []);

  // Recarrega as pastas salvas na montagem e ao fechar o modal
  useEffect(() => {
    loadSavedFolders();
  }, [isSettingsOpen, loadSavedFolders]);

  // 1. Carregar e sincronizar tasks do backend
  const fetchTasks = useCallback(() => {
    fetch(`${API_BASE_URL}/api/tasks`, {
      headers: {
        'ngrok-skip-browser-warning': 'true' // 👈 Adicionado para liberar no Ngrok
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Servidor indisponível');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setTasks(data);
        } else {
          setTasks([]);
        }
      })
      .catch(err => {
        // Log discreto caso o servidor local esteja offline
        console.warn('Aguardando conexão com o backend local...');
      });
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000); // Polling ajustado para 5s
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // 📌 Ref para manter a lista de tarefas atualizada no setInterval sem re-renders
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // 📌 Ref para evitar disparos duplicados dentro do mesmo minuto
  const lastExecutedRef = useRef({});

  // ⚡ Função de Execução do Script
  const handleRunTask = useCallback(async (task, e) => {
    if (e) e.stopPropagation();

    if (!task || !task.scriptPath) {
      console.warn('⚠️ Tentativa de execução sem caminho de script válido:', task);
      return;
    }

    try {
      // 🔄 Marca visualmente como 'processing' imediatamente no front
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'processing' } : t));

      const response = await fetch(`${API_BASE_URL}/api/tasks/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true' // 👈 Adicionado para liberar no Ngrok
        },
        body: JSON.stringify({
          taskId: task.id,
          taskTitle: task.title,
          scriptPath: task.scriptPath
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Sucesso na execução de [${task.title}]:`, result.output);
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'success' } : t));
      } else {
        console.error(`❌ Erro na execução de [${task.title}]:`, result.error);
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed' } : t));
      }

      // Sincroniza tarefas com o servidor após término
      fetchTasks();
    } catch (err) {
      console.error('Erro de conexão ao rodar tarefa:', err);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed' } : t));
    }
  }, [fetchTasks]);

  // 📌 Ref para manter a referência estável do handleRunTask
  const handleRunTaskRef = useRef(handleRunTask);
  useEffect(() => {
    handleRunTaskRef.current = handleRunTask;
  }, [handleRunTask]);

  // 🕒 AGENDADOR AUTOMÁTICO
  useEffect(() => {
    const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    const interval = setInterval(() => {
      const now = new Date();
      const currentDay = DAY_KEYS[now.getDay()];
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHour}:${currentMinute}`;

      const currentMinuteKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${currentTime}`;

      tasksRef.current.forEach(task => {
        const taskExecutionKey = `${task.id}-${currentMinuteKey}`;

        if (
          task.enabled &&
          Array.isArray(task.days) &&
          task.days.includes(currentDay) &&
          task.time === currentTime
        ) {
          if (!lastExecutedRef.current[taskExecutionKey]) {
            console.log(`⏰ Disparo agendado acionado: ${task.title} em ${currentTime}`);
            lastExecutedRef.current[taskExecutionKey] = true;
            handleRunTaskRef.current(task);
          }
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Ativar / Desativar a automação
  const toggleTask = async (id, e) => {
    e.stopPropagation();

    let updatedTask = null;

    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        updatedTask = { ...t, enabled: !t.enabled };
        return updatedTask;
      }
      return t;
    }));

    if (updatedTask) {
      try {
        await fetch(`${API_BASE_URL}/api/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true' // 👈 Adicionado para liberar no Ngrok
          },
          body: JSON.stringify(updatedTask),
        });
      } catch (err) {
        console.error('Erro ao salvar alteração de status no servidor:', err);
      }
    }
  };

  const handleOpenEdit = (task = null) => {
    if (task) {
      setCurrentTask({ ...task });
    } else {
      setCurrentTask({
        id: Date.now().toString(),
        title: '',
        time: '12:00',
        days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        enabled: true,
        scriptPath: '',
      });
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentTask) return;

    let finalTitle = currentTask.title ? currentTask.title.trim() : '';
    if (!finalTitle) {
      finalTitle = getFileNameWithoutExtension(currentTask.scriptPath) || 'Nova Automação';
    }

    const taskToSave = {
      ...currentTask,
      title: finalTitle,
    };

    setTasks(prev => {
      const exists = prev.some(t => t.id === taskToSave.id);
      return exists
        ? prev.map(t => (t.id === taskToSave.id ? taskToSave : t))
        : [...prev, taskToSave];
    });

    try {
      await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true' // 👈 Adicionado para liberar no Ngrok
        },
        body: JSON.stringify(taskToSave),
      });
      fetchTasks();
    } catch (err) {
      console.log('Backend não disponível no momento:', err);
    }

    setIsEditing(false);
    setCurrentTask(null);
  };

  const handleDelete = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setIsEditing(false);
    setCurrentTask(null);

    try {
      await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'ngrok-skip-browser-warning': 'true' // 👈 Adicionado para liberar no Ngrok
        }
      });
      fetchTasks();
    } catch (err) {
      console.error('Erro ao deletar no servidor:', err);
    }
  };

  const toggleDayInEdit = (key) => {
    if (!currentTask) return;
    const updatedDays = currentTask.days.includes(key)
      ? currentTask.days.filter(d => d !== key)
      : [...currentTask.days, key];
    setCurrentTask({ ...currentTask, days: updatedDays });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fullPath = `C:\\Automacoes\\${file.name}`;
      const autoTitle = getFileNameWithoutExtension(file.name);

      setCurrentTask(prev => ({
        ...prev,
        scriptPath: fullPath,
        title: (!prev.title || prev.title.trim() === '' || prev.title === 'Nova Automação')
          ? autoTitle
          : prev.title,
      }));
    }
  };

  const handleSelectPathForTask = (selectedPath) => {
    const autoTitle = getFileNameWithoutExtension(selectedPath);
    if (!isEditing || !currentTask) {
      handleOpenEdit();
    }
    setCurrentTask(prev => ({
      ...(prev || {
        id: Date.now().toString(),
        time: '12:00',
        days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        enabled: true,
      }),
      scriptPath: selectedPath,
      title: (!prev?.title || prev.title.trim() === '' || prev.title === 'Nova Automação')
        ? autoTitle
        : prev.title
    }));
  };

  return (
    <div className={`${styles.appContainer} ${darkMode ? styles.darkMode : ''}`}>

      <Header
        automations={tasks}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <div className={styles.mainLayout}>
        <aside className={styles.sidebar}>
          <ul>
            <li className={`${styles.navItem} ${activeMenu === 'Automacoes' ? styles.active : ''}`} onClick={() => setActiveMenu('Automacoes')}>
              ⚡ Automações BD
            </li>
            <li className={`${styles.navItem} ${activeMenu === 'Historico' ? styles.active : ''}`} onClick={() => setActiveMenu('Historico')}>
              📜 Histórico de Execuções
            </li>
            <li className={`${styles.navItem} ${activeMenu === 'Scripts' ? styles.active : ''}`} onClick={() => setActiveMenu('Scripts')}>
              📁 Repositório (.py / .txt)
            </li>
          </ul>

          <div className={styles.sidebarBottom}>
            <div
              className={styles.navItem}
              onClick={() => setIsSettingsOpen(true)}
              style={{ cursor: 'pointer' }}
            >
              ⚙️ Configurações da API
            </div>
          </div>
        </aside>

        <main className={styles.contentArea}>

          {/* ⚡ ABA 1: AUTOMAÇÕES */}
          {activeMenu === 'Automacoes' && (
            <>
              <div className={styles.cardsGrid}>
                {tasks.map(task => (
                  <div key={task.id} className={styles.alarmCard} onClick={() => handleOpenEdit(task)}>
                    <div className={styles.cardHeader}>
                      <span className={styles.timeDisplay}>{task.time}</span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          className={styles.runBtn}
                          title="Executar Agora"
                          onClick={(e) => handleRunTask(task, e)}
                          disabled={task.status === 'processing'}
                          style={{
                            background: task.status === 'processing' ? '#eab308' : '#22c55e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: task.status === 'processing' ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}
                        >
                          {task.status === 'processing' ? '⏳ Rodando...' : '▶ Rodar'}
                        </button>

                        <label className={styles.switch} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={task.enabled}
                            onChange={(e) => toggleTask(task.id, e)}
                          />
                          <span className={styles.slider}></span>
                        </label>
                      </div>
                    </div>

                    <div className={styles.subtitle}>
                      {task.status === 'processing'
                        ? '⏳ Em Processamento...'
                        : task.enabled
                          ? '🟢 Agendado'
                          : '⚪ Em espera'}
                    </div>

                    <div className={styles.alarmTitle}>{task.title}</div>

                    <div className={styles.daysContainer}>
                      {DAYS_LIST.map(d => (
                        <div
                          key={d.key}
                          className={`${styles.dayBadge} ${task.days && task.days.includes(d.key) ? styles.activeDay : ''}`}
                        >
                          {d.label}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.fabGroup}>
                <button title="Adicionar Automação" onClick={() => handleOpenEdit()}>＋</button>
              </div>
            </>
          )}

          {/* 📜 ABA 2: HISTÓRICO DE EXECUÇÕES */}
          {activeMenu === 'Historico' && (
            <HistoryView darkMode={darkMode} setDarkMode={setDarkMode} />
          )}

          {/* 📁 ABA 3: REPOSITÓRIO */}
          {activeMenu === 'Scripts' && (
            <div style={{ padding: '10px' }}>

              {/* 📁 REPOSITÓRIO DE SCRIPTS */}
              <div style={{ marginBottom: '30px' }}>
                <h2 style={{ color: darkMode ? '#ffffff' : '#1c1c1c' }}>Repositório de Scripts</h2>
                <p style={{ color: darkMode ? '#d1d5db' : '#4b5563', marginBottom: '15px' }}>
                  Caminhos configurados no diretório base{' '}
                  <code style={{
                    color: darkMode ? '#38bdf8' : '#0284c7',
                    backgroundColor: darkMode ? '#1e293b' : '#e0f2fe',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                  }}>
                    C:\Automacoes\
                  </code>:
                </p>

                {savedFolders.length === 0 ? (
                  <p style={{ color: darkMode ? '#ffffff' : '#1c1c1c' }}>Nenhum caminho adicionado nas configurações.</p>
                ) : (
                  <div className={styles.repositoryGrid}>
                    {savedFolders.map((folder) => {
                      const fullPath = `C:\\Automacoes\\${folder.folderName}\\${folder.mainScript}`;

                      return (
                        <div key={folder.id} className={styles.repoCard}>
                          <div className={styles.repoInfo}>
                            <span className={styles.repoIcon}>📄</span>
                            <div>
                              <strong className={styles.repoPath}>{fullPath}</strong>
                              <div className={styles.repoMeta}>
                                <span>Pasta: {folder.folderName}</span> | <span>Executor: {folder.mainScript}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className={styles.usePathBtn}
                            onClick={() => handleSelectPathForTask(fullPath)}
                          >
                            Selecionar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <hr style={{ borderColor: darkMode ? '#333' : '#e5e5e5', margin: '20px 0' }} />

              {/* 📜 REPOSITÓRIO DE ARQUIVOS (.PY / .TXT) */}
              <div>
                <h3 style={{ color: darkMode ? '#ffffff' : '#1c1c1c', marginTop: '20px' }}>
                  Repositório (.py / .txt)
                </h3>
                <p style={{ color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: '15px' }}>
                  Visualize e gerencie os códigos-fonte e scripts de texto associados.
                </p>

                <RepositoryView darkMode={darkMode} />
              </div>

            </div>
          )}

          {/* 📝 MODAL DE EDIÇÃO DE TAREFA */}
          {isEditing && currentTask && (
            <div className={styles.editPanelOverlay}>
              <div className={styles.editPanel}>
                <div className={styles.panelHeader}>
                  <span>Editar Agendamento</span>
                  <span
                    className={styles.deleteIcon}
                    title="Excluir"
                    onClick={() => handleDelete(currentTask.id)}
                  >
                    🗑️
                  </span>
                </div>

                <div className={styles.timePickerWheel}>
                  <TimeWheel
                    options={HOURS_ARRAY}
                    value={currentTask.time ? currentTask.time.split(':')[0] : '12'}
                    onChange={(newHour) => {
                      const mins = currentTask.time ? currentTask.time.split(':')[1] : '00';
                      setCurrentTask({ ...currentTask, time: `${newHour}:${mins}` });
                    }}
                  />

                  <span className={styles.separator}>:</span>

                  <TimeWheel
                    options={MINUTES_ARRAY}
                    value={currentTask.time ? currentTask.time.split(':')[1] : '00'}
                    onChange={(newMin) => {
                      const hrs = currentTask.time ? currentTask.time.split(':')[0] : '07';
                      setCurrentTask({ ...currentTask, time: `${hrs}:${newMin}` });
                    }}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label>Nome do Processo/Automação</label>
                  <input
                    type="text"
                    placeholder="Deixe em branco para usar o nome do arquivo"
                    value={currentTask.title || ''}
                    onChange={e => setCurrentTask({ ...currentTask, title: e.target.value })}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label>Caminho do Script (.py, .bat, .exe, etc)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Ex: C:\Automacoes\script.py"
                      value={currentTask.scriptPath || ''}
                      onChange={e => {
                        const newPath = e.target.value;
                        const autoTitle = getFileNameWithoutExtension(newPath);

                        setCurrentTask(prev => ({
                          ...prev,
                          scriptPath: newPath,
                          title: (!prev.title || prev.title.trim() === '' || prev.title === 'Nova Automação') && autoTitle
                            ? autoTitle
                            : prev.title
                        }));
                      }}
                      style={{ flex: 1 }}
                    />

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".py,.bat,.exe,.ps1"
                      style={{ display: 'none' }}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      style={{
                        padding: '0 12px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        backgroundColor: '#f0f0f0',
                        minWidth: '40px'
                      }}
                      title="Procurar arquivo em C:\Automacoes"
                    >
                      📁
                    </button>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label>Repetir execução nos dias:</label>
                  <div className={styles.repeatDays}>
                    {DAYS_LIST.map(d => {
                      const selected = currentTask.days ? currentTask.days.includes(d.key) : false;
                      return (
                        <button
                          key={d.key}
                          type="button"
                          className={`${styles.dayCircle} ${selected ? styles.selected : ''}`}
                          onClick={() => toggleDayInEdit(d.key)}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.panelActions}>
                  <button className={styles.btnSave} onClick={handleSave}>💾 Salvar</button>
                  <button className={styles.btnCancel} onClick={() => { setIsEditing(false); setCurrentTask(null); }}>✕ Cancelar</button>
                </div>
              </div>
            </div>
          )}
        </main>

      </div>

      {/* ⚙️ MODAL DE CONFIGURAÇÕES DE DIRETÓRIOS */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        darkMode={darkMode}
        onSelectScriptPath={handleSelectPathForTask}
      />
    </div>
  );
};

export default AutomationScheduler;