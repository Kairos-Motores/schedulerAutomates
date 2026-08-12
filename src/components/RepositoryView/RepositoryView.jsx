/* -------------------------------------------------------------------------
 * COMPONENTE: RepositoryView.jsx
 * ------------------------------------------------------------------------- */
import React, { useState, useEffect } from 'react';
import styles from './RepositoryView.module.scss';

export const RepositoryView = ({ darkMode, onSelectScriptForNewTask }) => {
    const [folders, setFolders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Carrega as pastas configuradas do localStorage
    useEffect(() => {
        const saved = localStorage.getItem('automation_folders');
        if (saved) {
            try {
                setFolders(JSON.parse(saved));
            } catch (e) {
                console.error('Erro ao ler pastas:', e);
            }
        }
    }, []);

    const baseDir = 'C:\\Automacoes\\';

    // Filtra as pastas e executáveis com base na busca
    const filteredFolders = folders.filter(f => {
        const term = searchTerm.toLowerCase();
        const fullPath = `${baseDir}${f.folderName}\\${f.mainScript}`.toLowerCase();
        return (
            f.folderName.toLowerCase().includes(term) ||
            f.mainScript.toLowerCase().includes(term) ||
            fullPath.includes(term)
        );
    });

    const handleCopyPath = (path) => {
        navigator.clipboard.writeText(path);
        alert(`Caminho copiado: ${path}`);
    };

    return (
        <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
            <div className={styles.header}>
                <div>
                    <h2>📁 Repositório de Scripts</h2>
                    <p className={styles.subtitle}>
                        Scripts e executáveis cadastrados em <code>{baseDir}</code>
                    </p>
                </div>

                {/* 🔍 CAMPO DE BUSCA */}
                <div className={styles.searchWrapper}>
                    <span>🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por script ou pasta..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredFolders.length === 0 ? (
                <div className={styles.emptyState}>
                    {folders.length === 0 ? (
                        <p>
                            Nenhum caminho adicionado ainda. Vá em <b>⚙️ Configurações da API</b> para cadastrar as pastas de <code>C:\Automacoes\</code>.
                        </p>
                    ) : (
                        <p>Nenhum script encontrado para "{searchTerm}".</p>
                    )}
                </div>
            ) : (
                <div className={styles.grid}>
                    {filteredFolders.map(folder => {
                        const fullPath = `${baseDir}${folder.folderName}\\${folder.mainScript}`;
                        const ext = folder.mainScript.split('.').pop() || 'py';

                        return (
                            <div key={folder.id} className={styles.scriptCard}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.badgeExt}>.{ext.toUpperCase()}</span>
                                    <span className={styles.folderTag}>📂 {folder.folderName}</span>
                                </div>

                                <div className={styles.scriptName}>{folder.mainScript}</div>
                                <div className={styles.fullPath} title={fullPath}>{fullPath}</div>

                                <div className={styles.cardActions}>
                                    {onSelectScriptForNewTask && (
                                        <button
                                            className={styles.createTaskBtn}
                                            onClick={() => onSelectScriptForNewTask(fullPath)}
                                        >
                                            ⚡ Criar Automação
                                        </button>
                                    )}
                                    <button
                                        className={styles.copyBtn}
                                        onClick={() => handleCopyPath(fullPath)}
                                        title="Copiar Caminho"
                                    >
                                        📋
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default RepositoryView;