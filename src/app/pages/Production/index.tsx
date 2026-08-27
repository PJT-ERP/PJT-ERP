import React, { useState } from "react";
import { S } from "../../components/production/ProductionHelpers";
import { SystemMessageDialog } from "../../components/production/modals/SystemMessageDialog";
import { AssignOperatorModal } from "../../components/production/modals/AssignOperatorModal";
import { StartProductionModal } from "../../components/production/modals/StartProductionModal";
import { PauseProductionModal } from "../../components/production/modals/PauseProductionModal";
import { CompleteProductionModal } from "../../components/production/modals/CompleteProductionModal";
import { MaterialReviewModal } from "../../components/production/modals/MaterialReviewModal";
import { ProductionDetailModal } from "../../components/production/modals/ProductionDetailModal";
import { ReturnToSpvModal } from "../../components/production/modals/ReturnToSpvModal";
import { useProductionBoard } from "./hooks/useProductionBoard";

import { MaterialPrepPanel } from "./components/panels/MaterialPrepPanel";
import { PendingAssignmentPanel } from "./components/panels/PendingAssignmentPanel";
import { ReadyToStartPanel } from "./components/panels/ReadyToStartPanel";
import { InProductionPanel } from "./components/panels/InProductionPanel";
import { WaitingQCPanel } from "./components/panels/WaitingQCPanel";
import { PendingDesignPanel } from "./components/panels/PendingDesignPanel";
import { CompletedProductionPanel } from "./components/panels/CompletedProductionPanel";

export function ProductionPage() {
  const board = useProductionBoard();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0, fontSize: "20px", fontWeight: 600 }}>Dasbor Produksi</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 4 }}>
            Kelola penugasan mesin, persiapan material, dan proses produksi berjalan
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${S.border}`, marginTop: 8 }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            background: "none", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer",
            color: activeTab === 'pending' ? S.cyan : S.secondary,
            borderBottom: activeTab === 'pending' ? `2px solid ${S.cyan}` : "2px solid transparent",
            padding: "0 4px 12px", marginBottom: "-1px", transition: "all 0.2s"
          }}
        >
          Sedang Berjalan
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          style={{
            background: "none", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer",
            color: activeTab === 'completed' ? S.cyan : S.secondary,
            borderBottom: activeTab === 'completed' ? `2px solid ${S.cyan}` : "2px solid transparent",
            padding: "0 4px 12px", marginBottom: "-1px", transition: "all 0.2s"
          }}
        >
          Riwayat Selesai
        </button>
      </div>

      {activeTab === 'pending' ? (
        <>
          {board.currentUser?.role === 'Engineering Supervisor' && <PendingDesignPanel board={board} />}
          <MaterialPrepPanel board={board} />
          <PendingAssignmentPanel board={board} />
          <ReadyToStartPanel board={board} />
          <InProductionPanel board={board} />
          <WaitingQCPanel board={board} />
        </>
      ) : (
        <CompletedProductionPanel board={board} />
      )}

      {/* Modals */}
      {board.assignModal && <AssignOperatorModal so={board.assignModal} onClose={() => board.setAssignModal(null)} />}
      {board.startModal && <StartProductionModal so={board.startModal} onClose={() => board.setStartModal(null)} onReturnToSpv={() => {
        board.setStartModal(null);
        board.setReturnToSpvModal(board.startModal);
      }} />}
      {board.completeModal && <CompleteProductionModal so={board.completeModal} onClose={() => board.setCompleteModal(null)} />}
      {board.pauseModal && <PauseProductionModal so={board.pauseModal} onClose={() => board.setPauseModal(null)} />}
      {board.reviewMrModal && (
        <MaterialReviewModal
          so={board.reviewMrModal}
          onClose={() => board.setReviewMrModal(null)}
          onApprove={() => board.approveMaterialRequest(board.reviewMrModal!)}
          onReject={(reason) => board.rejectMaterialRequest(board.reviewMrModal!, reason)}
        />
      )}
      {board.detailModal && <ProductionDetailModal so={board.detailModal} onClose={() => board.setDetailModal(null)} />}
      {board.returnToSpvModal && <ReturnToSpvModal so={board.returnToSpvModal} onClose={() => board.setReturnToSpvModal(null)} onSubmitted={() => board.setReturnToSpvModal(null)} />}
      {board.systemMessage && <SystemMessageDialog message={board.systemMessage} onClose={() => board.setSystemMessage(null)} />}
    </div>
  );
}

export default ProductionPage;
