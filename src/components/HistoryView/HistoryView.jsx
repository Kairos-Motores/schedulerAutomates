import React, { useState, useEffect } from 'react';
import styles from './HistoryView.module.scss';

export const HistoryView = ({ darkMode }) => {
    const [history, setHistory] = useState([]);
    const [selectedLog, setSelectedLog] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month'
    const [searchTerm, setSearchTerm] = useState(''); // 🔍 Termo de busca

    const fetchHistory = () => {
        fetch('https://schedulerautomates-backend.onrender.com/api/history')
            .then(res => res.json())
            .then(data => setHistory(data))
            .catch(err => console.error('Erro ao carregar histórico:', err));
    };

    useEffect(() => {
        fetchHistory();
        const interval = setInterval(fetchHistory, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleClearHistory = async () => {
        if (window.confirm('Tem certeza que deseja apagar todo o histórico?')) {
            await fetch('https://schedulerautomates-backend.onrender.com/api/history', { method: 'DELETE' });
            setHistory([]);
        }
    };

    // 🎯 Lógica de filtragem por data E por termo de busca (nome do processo ou do arquivo)
    const filteredHistory = history.filter(item => {
        // 1. Filtro de Texto (Nome do Processo / Nome do Arquivo / Caminho do Script)
        const term = searchTerm.toLowerCase().trim();
        if (term) {
            const matchTitle = item.title ? item.title.toLowerCase().includes(term) : false;
            const matchPath = item.scriptPath ? item.scriptPath.toLowerCase().includes(term) : false;
            const matchFileName = item.fileName ? item.fileName.toLowerCase().includes(term) : false;

            if (!matchTitle && !matchPath && !matchFileName) {
                return false;
            }
        }

        // 2. Filtro de Data
        if (filter === 'all') return true;

        const itemDate = new Date(item.timestamp);
        const now = new Date();

        if (filter === 'today') {
            return (
                itemDate.getDate() === now.getDate() &&
                itemDate.getMonth() === now.getMonth() &&
                itemDate.getFullYear() === now.getFullYear()
            );
        }

        if (filter === 'week') {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            return itemDate >= startOfWeek && itemDate <= endOfWeek;
        }

        if (filter === 'month') {
            return (
                itemDate.getMonth() === now.getMonth() &&
                itemDate.getFullYear() === now.getFullYear()
            );
        }

        return true;
    });

    return (
        <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
            <div className={styles.header}>
                <h2>📜 Histórico de Execuções</h2>

                <div className={styles.headerActions}>
                    {/* 🔍 CAMPO DE BUSCA */}
                    <div className={styles.searchWrapper}>
                        <span className={styles.searchIcon}>🔍</span>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Buscar por nome ou script.py..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                className={styles.clearSearchBtn}
                                onClick={() => setSearchTerm('')}
                                title="Limpar busca"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* 🔘 BOTÕES DE FILTRO POR DATA */}
                    <div className={styles.filterGroup}>
                        <button
                            className={`${styles.filterBtn} ${filter === 'today' ? styles.active : ''}`}
                            onClick={() => setFilter('today')}
                        >
                            Hoje
                        </button>
                        <button
                            className={`${styles.filterBtn} ${filter === 'week' ? styles.active : ''}`}
                            onClick={() => setFilter('week')}
                        >
                            Esta semana
                        </button>
                        <button
                            className={`${styles.filterBtn} ${filter === 'month' ? styles.active : ''}`}
                            onClick={() => setFilter('month')}
                        >
                            Este mês
                        </button>
                        <button
                            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            Todos
                        </button>
                    </div>

                    {history.length > 0 && (
                        <button className={styles.clearBtn} onClick={handleClearHistory}>
                            🗑️ Limpar
                        </button>
                    )}
                </div>
            </div>

            {filteredHistory.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>
                        {searchTerm
                            ? `Nenhum registro encontrado para "${searchTerm}".`
                            : 'Nenhuma execução registrada para o período selecionado.'}
                    </p>
                </div>
            ) : (
                <div className={styles.historyList}>
                    {filteredHistory.map(item => {
                        const dateObj = new Date(item.timestamp);
                        const formattedDate = dateObj.toLocaleDateString('pt-BR');
                        const formattedTime = dateObj.toLocaleTimeString('pt-BR');
                        const isSuccess = item.status === 'success';

                        return (
                            <div
                                key={item.id}
                                className={`${styles.card} ${isSuccess ? styles.success : styles.failed}`}
                            >
                                <div className={styles.info}>
                                    <div className={styles.title}>
                                        {item.title} {item.fileName && <span className={styles.fileName}>({item.fileName})</span>}
                                    </div>
                                    <div className={styles.meta}>
                                        <span>📅 {formattedDate}</span>
                                        <span>🕒 {formattedTime}</span>
                                        <span>📁 {item.scriptPath}</span>
                                    </div>
                                </div>

                                <div className={styles.actions}>
                                    <span className={`${styles.badge} ${isSuccess ? styles.success : styles.failed}`}>
                                        {isSuccess ? 'SUCCESS' : 'FAILED'}
                                    </span>

                                    <button className={styles.logBtn} onClick={() => setSelectedLog(item)}>
                                        🔍 Ver Log
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL DE LOGS */}
            {selectedLog && (
                <div className={styles.modalOverlay} onClick={() => setSelectedLog(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3>Log de Execução: {selectedLog.title}</h3>

                        <pre className={`${styles.logBox} ${selectedLog.status === 'success' ? styles.success : styles.failed}`}>
                            {selectedLog.output || 'Nenhuma saída de terminal registrada.'}
                        </pre>

                        <button className={styles.closeBtn} onClick={() => setSelectedLog(null)}>
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryView;