/* -------------------------------------------------------------------------
 * COMPONENTE: WeeklyChartModal.jsx
 * ------------------------------------------------------------------------- */
import React, { useEffect, useState } from 'react';
import styles from './WeeklyChartModal.module.scss';

const DAYS_MAP = [
    { key: 'sun', label: 'Dom', index: 0 },
    { key: 'mon', label: 'Seg', index: 1 },
    { key: 'tue', label: 'Ter', index: 2 },
    { key: 'wed', label: 'Qua', index: 3 },
    { key: 'thu', label: 'Qui', index: 4 },
    { key: 'fri', label: 'Sex', index: 5 },
    { key: 'sat', label: 'Sáb', index: 6 },
];

export const WeeklyChartModal = ({ isOpen, onClose }) => {
    const [weeklyStats, setWeeklyStats] = useState([
        { label: 'Dom', count: 0 },
        { label: 'Seg', count: 0 },
        { label: 'Ter', count: 0 },
        { label: 'Qua', count: 0 },
        { label: 'Qui', count: 0 },
        { label: 'Sex', count: 0 },
        { label: 'Sáb', count: 0 },
    ]);

    useEffect(() => {
        if (!isOpen) return;

        // Busca o histórico do backend para montar o histograma real da semana
        fetch('http://localhost:8000/api/history')
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data)) return;

                const now = new Date();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);

                const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

                data.forEach(item => {
                    const itemDate = new Date(item.timestamp);
                    if (itemDate >= startOfWeek) {
                        const dayOfWeek = itemDate.getDay(); // 0 a 6
                        counts[dayOfWeek] = (counts[dayOfWeek] || 0) + 1;
                    }
                });

                const updatedStats = DAYS_MAP.map(d => ({
                    label: d.label,
                    count: counts[d.index] || 0,
                }));

                setWeeklyStats(updatedStats);
            })
            .catch(err => console.error('Erro ao carregar estatísticas semanais:', err));
    }, [isOpen]);

    if (!isOpen) return null;

    // Descobre o valor máximo para calcular a altura proporcional das barras (%)
    const maxCount = Math.max(...weeklyStats.map(s => s.count), 1);

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3>📊 Histograma de Execuções Semanal</h3>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <p className={styles.subtitle}>Total de automações executadas por dia nesta semana:</p>

                {/* CONTÊINER DO HISTOGRAMA */}
                <div className={styles.chartContainer}>
                    {weeklyStats.map((item, idx) => {
                        const heightPercent = Math.round((item.count / maxCount) * 100);

                        return (
                            <div key={idx} className={styles.barGroup}>
                                <span className={styles.barValue}>{item.count}</span>
                                <div className={styles.barTrack}>
                                    <div
                                        className={styles.barFill}
                                        style={{ height: `${heightPercent === 0 ? 4 : heightPercent}%` }}
                                        title={`${item.label}: ${item.count} execuções`}
                                    />
                                </div>
                                <span className={styles.barLabel}>{item.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};