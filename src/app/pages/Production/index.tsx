import React from "react";
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

export function ProductionPage() {
  const board = useProductionBoard();

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

      {board.currentUser?.role === 'Engineering Supervisor' && <PendingDesignPanel board={board} />}
      <MaterialPrepPanel board={board} />
      <PendingAssignmentPanel board={board} />
      <ReadyToStartPanel board={board} />
      <InProductionPanel board={board} />
      <WaitingQCPanel board={board} />

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
