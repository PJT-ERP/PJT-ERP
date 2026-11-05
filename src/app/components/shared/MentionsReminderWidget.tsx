import React from 'react';
import { useNavigate } from 'react-router';
import { MessageSquare, AtSign, ChevronRight } from 'lucide-react';
import { useSalesOrdersQuery, useUsersQuery } from '../../services/queries';
import { isUserMentioned } from './mentions';
import { useApp } from '../context/AppContext';

export function MentionsReminderWidget() {
  const { currentUser } = useApp();
  const { data: salesOrders = [], isLoading } = useSalesOrdersQuery();
  const { data: users } = useUsersQuery(!!currentUser);
  const navigate = useNavigate();

  if (!currentUser) return null;

  const mentions = salesOrders.flatMap(so => {
    if (!so.comments) return [];
    return so.comments.filter(c => {
      if (c.userId === currentUser.id || (c as { isDeleted?: boolean }).isDeleted) return false;
      return isUserMentioned(c.content, currentUser, (users ?? []).map(u => u.name));
    }).map(c => ({
      soId: so.id,
      soNumber: so.soNumber || so.id,
      commentId: c.id,
      userName: c.userName,
      content: c.content,
      createdAtUtc: c.createdAtUtc,
    }));
  }).sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime())
    .slice(0, 5);

  const card: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 6, padding: "16px 18px" };
  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #E2E8F0" }}>
      <AtSign size={14} style={{ color: "#2563EB" }} />
      <span style={{ color: "#111827", fontSize: "13.5px", fontWeight: 600 }}>Mentions & Reminders</span>
    </div>
  );

  if (isLoading) {
    return (
      <div style={card}>
        {header}
        <div className="animate-pulse flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 40, background: "#F1F5F9", borderRadius: 4 }} />
          ))}
        </div>
      </div>
    );
  }

  if (mentions.length === 0) {
    return (
      <div style={card}>
        {header}
        <div style={{ padding: "12px 0", textAlign: "center", color: "#64748B", fontSize: "12.5px" }}>
          Belum ada mention terbaru untuk Anda.
        </div>
      </div>
    );
  }

  return (
    <div style={card}>
      {header}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {mentions.map((m, i) => (
          <div
            key={m.commentId}
            role="button"
            title="Lihat Pesan"
            onClick={() => navigate(`/erp/so/detail/${m.soId}`)}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", margin: "0 -6px",
              borderRadius: 4, cursor: "pointer", transition: "background 0.1s",
              borderBottom: i < mentions.length - 1 ? "1px solid #F1F5F9" : "none",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB", flexShrink: 0 }}>
              <MessageSquare size={12} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#111827", fontWeight: 500 }}>
                {m.userName} tag Anda di SO <span style={{ color: "#2563EB", fontWeight: 600 }}>{m.soNumber}</span>
              </p>
              <p style={{ margin: "2px 0", fontSize: "12px", color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                "{m.content.replace(/^>\*\*Membalas @[^*]+\*\*\n(?:>.*\n)*/, '')}"
              </p>
              <p style={{ margin: 0, fontSize: "11px", color: "#94A3B8" }}>
                {new Date(m.createdAtUtc.endsWith("Z") ? m.createdAtUtc : m.createdAtUtc + "Z").toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            </div>
            <ChevronRight size={14} style={{ color: "#94A3B8", flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
