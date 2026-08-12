/* -------------------------------------------------------------------------
 * ARQUIVO: src/components/Header/Header.jsx
 * ------------------------------------------------------------------------- */

import React, { useEffect, useState } from "react";
import Logo from "../../assets/logo.png";
import styled from "./style.module.scss";
import { WeeklyChartModal } from "./WeeklyChartModal";

const SunIcon = () => <span>☀️</span>;
const MoonIcon = () => <span>🌙</span>;
const AlertCircleIcon = () => <span style={{ color: "#ef4444" }}>🚫</span>;
const CheckCircleIcon = () => <span style={{ color: "#22c55e" }}>✅</span>;
const ClockIcon = () => <span style={{ color: "#eab308" }}>⏳</span>;

export const Header = ({
    automations = [],
    darkMode = false,
    setDarkMode
}) => {
    const [isChartOpen, setIsChartOpen] = useState(false);
    const [historyLogs, setHistoryLogs] = useState([]);

    useEffect(() => {
        if (darkMode) {
            document.body.classList.add("dark-theme");
        } else {
            document.body.classList.remove("dark-theme");
        }
    }, [darkMode]);

    // 📡 Busca os dados de histórico do backend
    useEffect(() => {
        const fetchHistory = () => {
            fetch("http://localhost:8000/api/history")
                .then((res) => res.json())
                .then((data) => {
                    if (Array.isArray(data)) {
                        setHistoryLogs(data);
                    }
                })
                .catch((err) => console.error("Erro ao carregar histórico no Header:", err));
        };

        fetchHistory();
        const interval = setInterval(fetchHistory, 2000);
        return () => clearInterval(interval);
    }, []);

    const totalAutomations = Array.isArray(automations) ? automations.length : 0;

    // 📅 Execuções HOJE
    const todayStr = new Date().toISOString().split("T")[0];
    const executedTodayCount = historyLogs.filter((log) => {
        if (!log.timestamp && !log.date) return false;
        const logDate = (log.timestamp || log.date).split("T")[0];
        return logDate === todayStr;
    }).length;

    // 🗓️ Execuções na SEMANA
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const executedWeekCount = historyLogs.filter((log) => {
        const logDate = new Date(log.timestamp || log.date || log.time);
        return !isNaN(logDate) && logDate >= startOfWeek;
    }).length;

    // 🔄 1. Verifica se tem alguma automação rodando ATUALMENTE
    const isProcessing =
        automations.some((a) => ["processing", "running", "in_progress", "em_andamento"].includes(a.status?.toLowerCase())) ||
        historyLogs.some((a) => ["processing", "running", "in_progress", "em_andamento"].includes(a.status?.toLowerCase()));

    // 🎯 2. Pega o LOG MAIS RECENTE do histórico (Index 0 por causa do unshift no backend)
    const latestLog = historyLogs.length > 0 ? historyLogs[0] : null;
    const latestStatus = latestLog?.status?.toLowerCase() || "";

    // ⚠️ 3. Verifica se a ÚLTIMA execução resultou em falha
    const isFailed = ["failed", "error", "falha"].includes(latestStatus);

    const todayFormatted = new Date().toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit"
    });

    return (
        <header className={styled.headerSection}>
            <div className={styled.headerContainer}>

                <div className={styled.logo}>
                    <img src={Logo} alt="logoPlaneta" />
                </div>

                {/* CONTADORES */}
                <div className={styled.metricsPanel}>
                    <div className={styled.metricItem}>
                        <span className={styled.metricLabel}>Automações:</span>
                        <span className={styled.metricValue}>{totalAutomations}</span>
                    </div>
                    <span className={styled.divider}>|</span>

                    <div className={styled.metricItem}>
                        <span className={styled.metricLabel}>No Dia:</span>
                        <span className={styled.metricValue}>{executedTodayCount}</span>
                    </div>
                    <span className={styled.divider}>|</span>

                    <div className={styled.metricItem}>
                        <span className={styled.metricLabel}>Na Semana:</span>
                        <span className={styled.metricValue}>{executedWeekCount}</span>
                    </div>
                    <span className={styled.divider}>|</span>

                    <div className={styled.metricItem}>
                        <span className={styled.metricLabel}>Hoje:</span>
                        <span className={styled.metricValue} style={{ textTransform: "capitalize" }}>
                            {todayFormatted}
                        </span>
                    </div>

                    {/* BADGE DE STATUS */}
                    <div className={styled.statusBadge}>
                        {isProcessing ? (
                            <span className={`${styled.status} ${styled.processing}`}>
                                <ClockIcon /> Processando
                            </span>
                        ) : isFailed ? (
                            <span className={`${styled.status} ${styled.failed}`}>
                                <AlertCircleIcon /> Falha
                            </span>
                        ) : (
                            <span className={`${styled.status} ${styled.success}`}>
                                <CheckCircleIcon /> Sucesso
                            </span>
                        )}
                    </div>
                </div>

                <div className={styled.headerIcons}>
                    <button className={styled.iconBtn} title="Invite">👥</button>

                    <button
                        className={styled.iconBtn}
                        title="Gráfico semanal"
                        onClick={() => setIsChartOpen(true)}
                    >
                        📊
                    </button>

                    <button className={styled.iconBtn} title="Help Desk">❓</button>

                    <button
                        className={styled.iconBtn}
                        onClick={() => setDarkMode && setDarkMode(!darkMode)}
                        title="Alternar Tema"
                    >
                        {darkMode ? <SunIcon /> : <MoonIcon />}
                    </button>
                </div>

            </div>

            <WeeklyChartModal
                isOpen={isChartOpen}
                onClose={() => setIsChartOpen(false)}
            />
        </header>
    );
};

export default Header;