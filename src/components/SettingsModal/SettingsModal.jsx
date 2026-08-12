import React, { useState, useEffect } from 'react';
import styles from './SettingsModal.module.scss';

export const SettingsModal = ({ isOpen, onClose, onSelectScriptPath, darkMode }) => {
    const [folders, setFolders] = useState([]);
    const [newFolderName, setNewFolderName] = useState('');
    const [newMainScript, setNewMainScript] = useState('main.py');
    const [isScanning, setIsScanning] = useState(false);

    const baseDir = 'C:\\Automacoes\\';

    // ⌨️ Fechar com ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // 💾 Carregar do LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('automation_folders');
        if (saved) {
            try { setFolders(JSON.parse(saved)); } catch (e) { console.error(e); }
        }
    }, []);

    const saveFolders = (updatedFolders) => {
        setFolders(updatedFolders);
        localStorage.setItem('automation_folders', JSON.stringify(updatedFolders));
    };

    // 🔄 ESCANEAR PASTAS NATIVAMENTE PELO NAVEGADOR (Sem Backend)
    const handleAutoScan = async () => {
        setIsScanning(true);
        try {
            // Método 1: Tenta usar a File System Access API (Moderna / Chrome, Edge, Opera)
            if ('showDirectoryPicker' in window) {
                const dirHandle = await window.showDirectoryPicker();
                const scannedFolders = [];

                for await (const entry of dirHandle.values()) {
                    // Pega APENAS as entradas que são diretórios/pastas
                    if (entry.kind === 'directory') {
                        scannedFolders.push(entry.name);
                    }
                }

                if (scannedFolders.length > 0) {
                    const updated = [...folders];
                    scannedFolders.forEach(folderName => {
                        if (!updated.some(f => f.folderName.toLowerCase() === folderName.toLowerCase())) {
                            updated.push({
                                id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
                                folderName: folderName,
                                mainScript: 'main.py'
                            });
                        }
                    });
                    saveFolders(updated);
                }
            } else {
                alert("Seu navegador não suporta a seleção direta de diretórios. Adicione as subpastas usando o formulário abaixo.");
            }
        } catch (err) {
            // O usuário cancelou a seleção da pasta ou fechou a janela
            if (err.name !== 'AbortError') {
                console.error("Erro ao selecionar diretório:", err);
            }
        } finally {
            setIsScanning(false);
        }
    };

    // 🧠 DETECÇÃO INTELIGENTE: Se o usuário colar um caminho inteiro
    const handleFolderInputChange = (e) => {
        const value = e.target.value;
        if (value.includes('C:\\Automacoes\\') || value.includes('/')) {
            const clean = value.replace('C:\\Automacoes\\', '').trim();
            const parts = clean.split(/[/\\]/);
            if (parts.length > 0) setNewFolderName(parts[0]);
            if (parts.length > 1 && (parts[1].endsWith('.py') || parts[1].endsWith('.bat'))) {
                setNewMainScript(parts[1]);
            }
        } else {
            setNewFolderName(value);
        }
    };

    const handleAddFolder = (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        const cleanFolder = newFolderName.replace(/[/\\]/g, '').trim();
        const cleanScript = newMainScript.trim() || 'main.py';

        const updated = [...folders, { id: Date.now().toString(), folderName: cleanFolder, mainScript: cleanScript }];
        saveFolders(updated);

        setNewFolderName('');
        setNewMainScript('main.py');
    };

    const handleDeleteFolder = (id) => saveFolders(folders.filter(f => f.id !== id));

    const handleUsePath = (folder) => {
        const fullPath = `${baseDir}${folder.folderName}\\${folder.mainScript}`;
        if (onSelectScriptPath) onSelectScriptPath(fullPath);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                className={`${styles.modalContent} ${darkMode ? styles.darkMode : ''}`}
                onClick={e => e.stopPropagation()}
                role="dialog"
            >
                <div className={styles.header}>
                    <h3 id="modal-title" style={{ color: darkMode ? '#ffffff' : '#1e293b' }}>
                        ⚙️ Configurações de Diretórios & Executáveis
                    </h3>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <p style={{ color: darkMode ? '#9ca3af' : '#4b5563', fontSize: '13px', marginBottom: '16px' }}>
                    Pastas configuradas no diretório base{' '}
                    <code style={{ color: darkMode ? '#38bdf8' : '#0284c7', backgroundColor: darkMode ? '#1e293b' : '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                        {baseDir}
                    </code>
                </p>

                {/* 🔍 BOTÃO DE ESCANEAMENTO AUTOMÁTICO */}
                <div style={{ marginBottom: '16px' }}>
                    <button
                        type="button"
                        onClick={handleAutoScan}
                        disabled={isScanning}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: darkMode ? '#3b82f6' : '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        {isScanning ? '🔍 Escaneando diretório...' : '🔄 Buscar Pastas Automaticamente'}
                    </button>
                </div>

                {/* ➕ FORMULÁRIO RÁPIDO */}
                <form className={styles.addForm} onSubmit={handleAddFolder}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="folderInput" style={{ color: darkMode ? '#cbd5e1' : '#334155', fontWeight: '600' }}>
                            Subpasta ou Caminho
                        </label>
                        <input
                            id="folderInput"
                            type="text"
                            placeholder="Ex: pasta_programa1 ou cole o caminho"
                            value={newFolderName}
                            onChange={handleFolderInputChange}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="scriptInput" style={{ color: darkMode ? '#cbd5e1' : '#334155', fontWeight: '600' }}>
                            Script Executor (Main)
                        </label>
                        <input
                            id="scriptInput"
                            type="text"
                            placeholder="main.py"
                            value={newMainScript}
                            onChange={e => setNewMainScript(e.target.value)}
                        />
                    </div>

                    <button type="submit" className={styles.addBtn}>＋ Adicionar</button>
                </form>

                <hr className={styles.divider} />

                {/* 📋 LISTA */}
                <div className={styles.folderList}>
                    <h4>Pastas Configuradas:</h4>
                    {folders.length === 0 ? (
                        <p className={styles.emptyText}>Nenhuma subpasta cadastrada.</p>
                    ) : (
                        folders.map(folder => {
                            const fullPath = `${baseDir}${folder.folderName}\\${folder.mainScript}`;
                            return (
                                <div key={folder.id} className={styles.folderCard}>
                                    <div className={styles.folderInfo}>
                                        <div className={styles.folderPath}>📁 {fullPath}</div>
                                        <div style={{ color: darkMode ? '#cbd5e1' : '#475569', fontSize: '12px', marginTop: '4px' }}>
                                            <span>Pasta: <strong style={{ color: darkMode ? '#f8fafc' : '#0f172a' }}>{folder.folderName}</strong></span>
                                            <span style={{ margin: '0 8px', opacity: 0.5 }}>|</span>
                                            <span>Executor: <strong style={{ color: darkMode ? '#f8fafc' : '#0f172a' }}>{folder.mainScript}</strong></span>
                                        </div>
                                    </div>

                                    <div className={styles.cardActions}>
                                        {onSelectScriptPath && (
                                            <button className={styles.useBtn} onClick={() => handleUsePath(folder)}>
                                                Usar Caminho
                                            </button>
                                        )}
                                        <button className={styles.deleteBtn} onClick={() => handleDeleteFolder(folder.id)}>
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;