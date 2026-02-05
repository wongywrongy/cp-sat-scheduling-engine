import { useState } from "react";

const COURTS = ["C1", "C2", "C3", "C4", "C5", "C6"];

const GANTT_MATCHES = {
    C1: [
        { id: "WS5", time: "23:00", status: "scheduled", light: "green", duration: 1 },
        { id: "XD9", time: "23:10", status: "scheduled", light: "yellow", duration: 1 },
        { id: "MS7", time: "23:20", status: "scheduled", light: "red", duration: 1 },
        { id: "MS12", time: "23:30", status: "scheduled", light: "green", duration: 1 },
        { id: "WD2", time: "23:40", status: "scheduled", light: "yellow", duration: 1 },
        { id: "MD1", time: "01:20", status: "scheduled", light: "green", duration: 1.5 },
    ],
    C2: [
        { id: "MS10", time: "23:00", status: "scheduled", light: "green", duration: 1 },
        { id: "WS3", time: "23:10", status: "scheduled", light: "red", duration: 1 },
        { id: "MS2", time: "23:20", status: "scheduled", light: "green", duration: 1 },
        { id: "MS4", time: "23:30", status: "scheduled", light: "yellow", duration: 1.2 },
        { id: "MD5", time: "23:50", status: "scheduled", light: "green", duration: 1 },
        { id: "MD7", time: "00:20", status: "scheduled", light: "green", duration: 1 },
        { id: "WD3", time: "00:40", status: "scheduled", light: "yellow", duration: 1 },
    ],
    C3: [
        { id: "MD2", time: "23:00", status: "scheduled", light: "green", duration: 1.2 },
        { id: "MS9", time: "23:15", status: "scheduled", light: "red", duration: 1 },
        { id: "MS11", time: "23:25", status: "scheduled", light: "yellow", duration: 1 },
        { id: "XD2", time: "23:40", status: "scheduled", light: "green", duration: 1.5 },
        { id: "MD3", time: "00:20", status: "scheduled", light: "red", duration: 1.2 },
    ],
    C4: [
        { id: "XD6", time: "23:00", status: "scheduled", light: "green", duration: 1 },
        { id: "MS14", time: "23:10", status: "scheduled", light: "yellow", duration: 1 },
        { id: "XD7", time: "23:20", status: "scheduled", light: "green", duration: 1 },
        { id: "WS2", time: "23:30", status: "scheduled", light: "green", duration: 1 },
        { id: "MS1", time: "23:40", status: "scheduled", light: "red", duration: 1 },
        { id: "MD4", time: "00:00", status: "scheduled", light: "green", duration: 1.2 },
        { id: "MD9", time: "00:40", status: "scheduled", light: "yellow", duration: 1 },
    ],
    C5: [
        { id: "WS4", time: "23:00", status: "scheduled", light: "green", duration: 1 },
        { id: "XD10", time: "23:10", status: "scheduled", light: "yellow", duration: 1.3 },
        { id: "MS3", time: "23:25", status: "scheduled", light: "green", duration: 1 },
        { id: "MS4", time: "23:35", status: "scheduled", light: "green", duration: 1 },
        { id: "MD6", time: "23:50", status: "scheduled", light: "red", duration: 1 },
        { id: "MD5", time: "00:10", status: "scheduled", light: "green", duration: 1 },
        { id: "MD8", time: "00:30", status: "scheduled", light: "red", duration: 1.3 },
        { id: "XD8", time: "01:10", status: "scheduled", light: "green", duration: 1.2 },
    ],
    C6: [
        { id: "MS8", time: "23:00", status: "scheduled", light: "green", duration: 1 },
        { id: "WS1", time: "23:10", status: "scheduled", light: "yellow", duration: 1 },
        { id: "MS5", time: "23:20", status: "scheduled", light: "green", duration: 1 },
        { id: "WD4", time: "23:30", status: "scheduled", light: "green", duration: 1.3 },
        { id: "WD1", time: "23:50", status: "scheduled", light: "green", duration: 1 },
        { id: "MS6", time: "00:10", status: "scheduled", light: "yellow", duration: 1 },
        { id: "XD3", time: "00:20", status: "scheduled", light: "green", duration: 1 },
        { id: "XD4", time: "00:30", status: "scheduled", light: "green", duration: 1 },
        { id: "XD5", time: "00:40", status: "scheduled", light: "red", duration: 1 },
        { id: "XD1", time: "00:50", status: "scheduled", light: "green", duration: 1 },
    ],
};

const WORKFLOW = {
    in_progress: [
        { id: "MS2", court: "C2", time: "23:20", players: "Alex Nguyen vs Evan Chen", elapsed: "4:32" },
        { id: "WS3", court: "C3", time: "23:20", players: "Chelsea Lin vs Rachel Chen", elapsed: "4:32" },
        { id: "XD8", court: "C5", time: "23:17", players: "Seong Kang & Sankhya Gunda vs Grace Chow & Paolo Tayag", elapsed: "7:12" },
    ],
    up_next: [
        { id: "MS11", court: "C4", time: "23:40", players: "Benny Wen vs Brion Ye", light: "green", reason: null },
        { id: "MD2", court: "C3", time: "23:00", players: "Khang Nguyen & Tyler Yeh vs Jonas Kurniawan & Nachiketh Karthik", light: "green", reason: null },
        { id: "WS1", court: "C6", time: "23:20", players: "Rupashi Bahl vs Alexa Tyberg", light: "green", reason: null },
        { id: "MS9", court: "C3", time: "23:20", players: "Juan David Liang vs Yushun Zou", light: "yellow", reason: "Resting — Yushun Zou available in 3 min" },
        { id: "WD4", court: "C6", time: "00:00", players: "Joyce Sandara & Momoka Watanuki vs Felicity Huang & Jenny Kim", light: "yellow", reason: "Resting — Momoka Watanuki available in 6 min" },
        { id: "MS13", court: "C1", time: "00:00", players: "Issac Li vs Nathan Luk", light: "red", reason: "Blocked — Nathan Luk is playing MS2 on Court 2" },
        { id: "MS14", court: "C3", time: "23:20", players: "Ethan Phan vs Melvin Liam Poon Keat", light: "red", reason: "Blocked — Ethan Phan is playing WS3 on Court 3" },
    ],
    finished: [
        { id: "MS7", court: "C1", score: "21-18", players: "Sean Hsieh vs Paolo Tayag" },
        { id: "XD6", court: "C4", score: "21-9", players: "Alex Feng & Kyle Wong vs Connie Hong & Rachel Chen" },
    ],
};

const SUGGESTIONS = [
    { id: "MS11", court: "C4", players: "Benny Wen vs Brion Ye", reason: "Court 4 free · all players ready" },
    { id: "MD2", court: "C3", players: "Khang Nguyen & Tyler Yeh vs Jonas K. & Nachiketh K.", reason: "Court 3 free · all players ready" },
    { id: "WS1", court: "C1", players: "Rupashi Bahl vs Alexa Tyberg", reason: "Court 1 free · all players ready" },
];

const lightColors = {
    green: { bg: "#ECFDF5", border: "#059669", dot: "#059669", text: "#065F46" },
    yellow: { bg: "#FFFBEB", border: "#D97706", dot: "#D97706", text: "#92400E" },
    red: { bg: "#FEF2F2", border: "#DC2626", dot: "#DC2626", text: "#991B1B" },
};

const ganttLightColors = {
    green: { bg: "#D1FAE5", border: "#059669", text: "#065F46" },
    yellow: { bg: "#FEF3C7", border: "#D97706", text: "#92400E" },
    red: { bg: "#FECACA", border: "#DC2626", text: "#991B1B" },
};

export default function ControlPage() {
    const [selectedMatch, setSelectedMatch] = useState("MS11");
    const [hoveredMatch, setHoveredMatch] = useState(null);
    const [activeTab, setActiveTab] = useState("up_next");

    const selectedData = [...WORKFLOW.in_progress, ...WORKFLOW.up_next, ...WORKFLOW.finished].find(
        (m) => m.id === selectedMatch
    );

    const timeSlots = ["23:00", "23:20", "23:40", "00:00", "00:20", "00:40", "01:00", "01:20", "01:40"];

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#F8FAFC", fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", color: "#1E293B", overflow: "hidden" }}>
            {/* Top Nav */}
            <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", background: "#fff", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 24, fontSize: 14, fontWeight: 500 }}>
                    {["Setup", "Players", "Matches", "Schedule", "Control"].map((tab) => (
                        <span key={tab} style={{ color: tab === "Control" ? "#2563EB" : "#64748B", cursor: "pointer", padding: "4px 0", borderBottom: tab === "Control" ? "2px solid #2563EB" : "none" }}>{tab}</span>
                    ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669" }} />
                    <span style={{ fontSize: 13, color: "#059669", fontWeight: 500 }}>Online</span>
                </div>
            </nav>

            {/* Status Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 20px", background: "#fff", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>7% complete</span>
                    <span style={{ color: "#64748B" }}>3/43 matches</span>
                    <span style={{ color: "#64748B" }}>3 active</span>
                    <span style={{ background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>12 running late</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669" }} /> Ready</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D97706" }} /> Resting</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626" }} /> Blocked</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, border: "2px solid #F59E0B", background: "transparent" }} /> Late</span>
                    <button style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Re-optimize</button>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
                {/* Left: Gantt + Workflow */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

                    {/* Gantt Chart */}
                    <div style={{ padding: "12px 20px", background: "#fff", borderBottom: "1px solid #E2E8F0", overflowX: "auto", flexShrink: 0 }}>
                        {/* Time header */}
                        <div style={{ display: "flex", marginLeft: 32, marginBottom: 6 }}>
                            {timeSlots.map((t) => (
                                <div key={t} style={{ width: 120, fontSize: 11, color: "#94A3B8", flexShrink: 0 }}>{t}</div>
                            ))}
                        </div>
                        {/* Court rows */}
                        {COURTS.map((court) => (
                            <div key={court} style={{ display: "flex", alignItems: "center", marginBottom: 3 }}>
                                <div style={{ width: 28, fontSize: 12, fontWeight: 600, color: "#64748B", flexShrink: 0 }}>{court}</div>
                                <div style={{ display: "flex", gap: 2, flex: 1 }}>
                                    {(GANTT_MATCHES[court] || []).map((match) => {
                                        const c = ganttLightColors[match.light];
                                        const isSelected = selectedMatch === match.id;
                                        return (
                                            <div
                                                key={match.id}
                                                onClick={() => setSelectedMatch(match.id)}
                                                style={{
                                                    background: c.bg,
                                                    border: `1.5px solid ${isSelected ? "#2563EB" : c.border}`,
                                                    borderRadius: 4,
                                                    padding: "3px 8px",
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: c.text,
                                                    cursor: "pointer",
                                                    whiteSpace: "nowrap",
                                                    minWidth: Math.max(56, match.duration * 70),
                                                    boxShadow: isSelected ? "0 0 0 2px rgba(37,99,235,0.3)" : "none",
                                                    transition: "all 0.15s ease",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                }}
                                            >
                                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.border, flexShrink: 0 }} />
                                                {match.id}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Workflow Panel */}
                    <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
                        {/* In Progress */}
                        <div style={{ width: 320, borderRight: "1px solid #E2E8F0", background: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                            <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669" }} />
                                <span style={{ fontWeight: 600, fontSize: 13 }}>In Progress</span>
                                <span style={{ fontSize: 12, color: "#94A3B8" }}>({WORKFLOW.in_progress.length})</span>
                            </div>
                            <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
                                {WORKFLOW.in_progress.map((m) => (
                                    <div
                                        key={m.id}
                                        onClick={() => setSelectedMatch(m.id)}
                                        style={{
                                            background: selectedMatch === m.id ? "#EFF6FF" : "#F0FDF4",
                                            border: `1px solid ${selectedMatch === m.id ? "#2563EB" : "#BBF7D0"}`,
                                            borderRadius: 8,
                                            padding: "10px 12px",
                                            marginBottom: 6,
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ fontWeight: 700, fontSize: 13 }}>{m.id}</span>
                                                <span style={{ fontSize: 11, color: "#64748B" }}>{m.court}</span>
                                            </div>
                                            <div style={{ display: "flex", gap: 4 }}>
                                                <button style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Finish</button>
                                                <button style={{ background: "#E2E8F0", color: "#475569", border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 11, cursor: "pointer" }}>Undo</button>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>{m.players}</div>
                                        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#64748B" }}>
                                            <span>⏱ {m.elapsed}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Up Next / Finished tabs */}
                        <div style={{ flex: 1, background: "#fff", display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
                                {[
                                    { key: "up_next", label: "Up Next", count: WORKFLOW.up_next.length, color: "#2563EB" },
                                    { key: "finished", label: "Finished", count: WORKFLOW.finished.length, color: "#7C3AED" },
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        style={{
                                            padding: "10px 16px",
                                            fontSize: 13,
                                            fontWeight: 600,
                                            background: "none",
                                            border: "none",
                                            borderBottom: activeTab === tab.key ? `2px solid ${tab.color}` : "2px solid transparent",
                                            color: activeTab === tab.key ? tab.color : "#94A3B8",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                        }}
                                    >
                                        {tab.label}
                                        <span style={{ background: activeTab === tab.key ? tab.color + "15" : "#F1F5F9", color: activeTab === tab.key ? tab.color : "#94A3B8", padding: "1px 6px", borderRadius: 10, fontSize: 11 }}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
                                {activeTab === "up_next" &&
                                    WORKFLOW.up_next.map((m) => {
                                        const c = lightColors[m.light];
                                        return (
                                            <div
                                                key={m.id}
                                                onClick={() => setSelectedMatch(m.id)}
                                                onMouseEnter={() => setHoveredMatch(m.id)}
                                                onMouseLeave={() => setHoveredMatch(null)}
                                                style={{
                                                    background: selectedMatch === m.id ? "#EFF6FF" : c.bg,
                                                    border: `1px solid ${selectedMatch === m.id ? "#2563EB" : c.border + "40"}`,
                                                    borderLeft: `3px solid ${c.border}`,
                                                    borderRadius: 8,
                                                    padding: "10px 12px",
                                                    marginBottom: 6,
                                                    cursor: "pointer",
                                                    transition: "all 0.15s ease",
                                                    position: "relative",
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot }} />
                                                        <span style={{ fontWeight: 700, fontSize: 13 }}>{m.id}</span>
                                                        <span style={{ fontSize: 11, color: "#64748B" }}>{m.court} · {m.time}</span>
                                                        {m.time <= "23:20" && <span style={{ fontSize: 10, color: "#D97706", fontWeight: 600 }}>(late)</span>}
                                                    </div>
                                                    <div style={{ display: "flex", gap: 4 }}>
                                                        {m.light === "green" && (
                                                            <button style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Call</button>
                                                        )}
                                                        {m.light !== "green" && (
                                                            <button disabled style={{ background: "#E2E8F0", color: "#94A3B8", border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "not-allowed" }}>Call</button>
                                                        )}
                                                        <button style={{ background: "#F59E0B", color: "#fff", border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Delay</button>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 12, color: "#374151" }}>{m.players}</div>
                                                {/* Tooltip on hover for yellow/red */}
                                                {hoveredMatch === m.id && m.reason && (
                                                    <div style={{
                                                        marginTop: 6,
                                                        padding: "6px 10px",
                                                        background: c.border + "12",
                                                        borderRadius: 6,
                                                        fontSize: 11,
                                                        color: c.text,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 6,
                                                    }}>
                                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />
                                                        {m.reason}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                {activeTab === "finished" &&
                                    WORKFLOW.finished.map((m) => (
                                        <div
                                            key={m.id}
                                            onClick={() => setSelectedMatch(m.id)}
                                            style={{
                                                background: selectedMatch === m.id ? "#EFF6FF" : "#FAFAFA",
                                                border: `1px solid ${selectedMatch === m.id ? "#2563EB" : "#E2E8F0"}`,
                                                borderRadius: 8,
                                                padding: "10px 12px",
                                                marginBottom: 6,
                                                cursor: "pointer",
                                            }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    <span style={{ fontWeight: 700, fontSize: 13, color: "#64748B" }}>{m.id}</span>
                                                    <span style={{ fontSize: 11, color: "#94A3B8" }}>{m.court}</span>
                                                </div>
                                                <span style={{ fontWeight: 700, fontSize: 13, color: "#7C3AED" }}>{m.score}</span>
                                            </div>
                                            <div style={{ fontSize: 12, color: "#94A3B8" }}>{m.players}</div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Match Details */}
                <div style={{ width: 300, background: "#fff", borderLeft: "1px solid #E2E8F0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                    <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #E2E8F0" }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>Match Details</span>
                    </div>
                    {selectedData ? (
                        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
                            {/* Header */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: "#1E293B", marginBottom: 2 }}>{selectedData.id}</div>
                                <div style={{ fontSize: 12, color: "#64748B" }}>{selectedData.court} · Scheduled {selectedData.time}</div>
                            </div>

                            {/* Status badge */}
                            {selectedData.light && (
                                <div style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "4px 10px",
                                    borderRadius: 20,
                                    background: lightColors[selectedData.light]?.bg || "#F1F5F9",
                                    marginBottom: 16,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: lightColors[selectedData.light]?.text || "#475569",
                                }}>
                                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: lightColors[selectedData.light]?.dot || "#94A3B8" }} />
                                    {selectedData.light === "green" ? "Ready to call" : selectedData.light === "yellow" ? "Resting" : "Blocked"}
                                </div>
                            )}
                            {selectedData.elapsed && (
                                <div style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "4px 10px",
                                    borderRadius: 20,
                                    background: "#F0FDF4",
                                    marginBottom: 16,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "#065F46",
                                }}>
                                    ▶ In Progress
                                </div>
                            )}
                            {selectedData.score && (
                                <div style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "4px 10px",
                                    borderRadius: 20,
                                    background: "#F3F0FF",
                                    marginBottom: 16,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "#5B21B6",
                                }}>
                                    ✓ Finished — {selectedData.score}
                                </div>
                            )}

                            {/* Reason */}
                            {selectedData.reason && (
                                <div style={{
                                    padding: "8px 12px",
                                    background: lightColors[selectedData.light]?.bg,
                                    border: `1px solid ${lightColors[selectedData.light]?.border}30`,
                                    borderRadius: 8,
                                    fontSize: 12,
                                    color: lightColors[selectedData.light]?.text,
                                    marginBottom: 16,
                                    lineHeight: 1.5,
                                }}>
                                    {selectedData.reason}
                                </div>
                            )}

                            {/* Players */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Players</div>
                                {selectedData.players?.split(" vs ").map((side, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                        <span style={{ width: 20, height: 20, borderRadius: "50%", background: i === 0 ? "#DBEAFE" : "#FCE7F3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: i === 0 ? "#2563EB" : "#DB2777" }}>
                                            {i === 0 ? "A" : "B"}
                                        </span>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{side}</div>
                                            <div style={{ fontSize: 11, color: "#94A3B8" }}>Lincoln High</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Timing */}
                            {selectedData.elapsed && (
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Timing</div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                                        <span style={{ color: "#64748B" }}>Elapsed</span>
                                        <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{selectedData.elapsed}</span>
                                    </div>
                                </div>
                            )}

                            {/* Impacted Matches */}
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                                    Impacted Matches (3)
                                </div>
                                {["MD3", "MD8", "XD2"].map((mid) => (
                                    <div
                                        key={mid}
                                        onClick={() => setSelectedMatch(mid)}
                                        style={{
                                            padding: "6px 10px",
                                            background: "#F8FAFC",
                                            border: "1px solid #E2E8F0",
                                            borderRadius: 6,
                                            marginBottom: 4,
                                            fontSize: 12,
                                            fontWeight: 500,
                                            cursor: "pointer",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span>{mid}</span>
                                        <span style={{ fontSize: 11, color: "#94A3B8" }}>→</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: 13 }}>
                            Click a match to see details
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Dock — Suggested Next */}
            <div style={{
                flexShrink: 0,
                background: "#1E293B",
                borderTop: "1px solid #334155",
                padding: "10px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC", letterSpacing: "0.03em" }}>SUGGESTED NEXT</span>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669", animation: "pulse 2s infinite" }} />
                </div>
                <div style={{ width: 1, height: 28, background: "#475569", flexShrink: 0 }} />
                <div style={{ display: "flex", gap: 10, overflow: "auto", flex: 1 }}>
                    {SUGGESTIONS.map((s, i) => (
                        <div
                            key={s.id}
                            style={{
                                background: selectedMatch === s.id ? "#059669" : i === 0 ? "#059669" : "#334155",
                                borderRadius: 8,
                                padding: "8px 14px",
                                cursor: "pointer",
                                flexShrink: 0,
                                transition: "all 0.15s ease",
                                border: selectedMatch === s.id ? "1px solid #34D399" : i === 0 ? "1px solid #34D399" : "1px solid #475569",
                            }}
                            onClick={() => { setSelectedMatch(s.id); setActiveTab("up_next"); }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: "#F8FAFC" }}>{s.id}</span>
                                <span style={{ fontSize: 11, color: (selectedMatch === s.id || i === 0) ? "#A7F3D0" : "#94A3B8" }}>→ {s.court}</span>
                            </div>
                            <div style={{ fontSize: 11, color: (selectedMatch === s.id || i === 0) ? "#D1FAE5" : "#94A3B8" }}>{s.reason}</div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
      `}</style>
        </div>
    );
}