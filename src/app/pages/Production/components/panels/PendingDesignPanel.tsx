import React from 'react';
import { useNavigate } from 'react-router';
import { PenTool } from 'lucide-react';
import { S } from '../../../../components/production/ProductionHelpers';

export function PendingDesignPanel({ board }: { board: any }) {
  const navigate = useNavigate();
  const list = board.pendingDesign || [];
  
  return (
    <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${S.border}`, background: '#F8FAFC' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PenTool size={16} style={{ color: S.cyan }} />
          <span style={{ color: S.slate, fontSize: '14px', fontWeight: 600 }}>Fase Desain ({list.length})</span>
        </div>
      </div>
      
      {list.length === 0 ? (
        <div style={{ padding: '30px 20px', textAlign: 'center', color: S.secondary, fontSize: '13px' }}>
          Tidak ada pesanan yang sedang menunggu desain
        </div>
      ) : (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((so: any) => (
            <div key={so.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: `1px solid ${S.border}`, borderRadius: 6 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: S.slate }}>{so.soNumber || so.id}</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 4, background: '#FEF2F2', color: '#DC2626', fontWeight: 500 }}>Pending Design</span>
                </div>
                <div style={{ fontSize: '12px', color: S.secondary }}>
                  Pelanggan: <strong style={{ color: S.slate }}>{so.customerName}</strong>
                  <span style={{ margin: '0 8px', color: S.border }}>|</span>
                  Deadline: <strong style={{ color: S.slate }}>{so.deadline}</strong>
                </div>
              </div>
              <button
                onClick={() => navigate('/erp/engineer-tasks')}
                style={{ background: '#DC2626', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 4, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Input Desain
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
