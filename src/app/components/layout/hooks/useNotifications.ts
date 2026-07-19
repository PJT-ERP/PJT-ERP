import { useMemo } from "react";

export function useNotifications({
  currentUser,
  salesOrders,
  purchasingRequests,
  invoices,
  payments,
  dismissedNotifIds,
}: {
  currentUser: any;
  salesOrders: any[];
  purchasingRequests: any[];
  invoices: any[];
  payments: any[];
  dismissedNotifIds: string[];
}) {
  const notifications = useMemo(() => {
    if (!currentUser) return [];
    const notifs: { id: string, type: 'alert' | 'warning' | 'success' | 'info', title: string, desc: string, targetPath?: string, isDismissible?: boolean }[] = [];
    const role = currentUser.role;

    if (role === 'Owner') {
      // Owner hanya memantau info, tidak melakukan approval.
    } else if (role === 'Sales') {
      salesOrders.forEach(so => {
        if (so.status === 'Waiting Pricing') {
          notifs.push({ id: so.id, type: 'warning', title: 'Harga Sedang Dihitung', desc: `SO ${so.id} sedang dihitung harganya oleh Finance.`, targetPath: `/erp/so/detail/${so.id}` });
        }
        if (so.status === 'Waiting Payment') {
          const invoice = invoices.find(inv => inv.soNumber === so.soNumber);
          const hasReportedPayment = invoice && payments.some(p => p.invoiceId === invoice.id && (p.status === "PENDING" || p.status === "VERIFIED"));
          if (!hasReportedPayment) {
            notifs.push({ id: so.id, type: 'success', title: 'Tagihan Siap', desc: `Invoice untuk SO ${so.id} siap dibayar oleh pelanggan.`, targetPath: `/erp/so/detail/${so.id}` });
          }
        }
        if (so.status === 'Rejected') {
          notifs.push({ id: so.id, type: 'alert', title: 'SO Ditolak / Direvisi', desc: `SO ${so.id} dikembalikan untuk direvisi.`, targetPath: `/erp/so/detail/${so.id}` });
        }
        if (so.status === 'Completed') {
          const notifId = `so-comp-${so.id}`;
          if (!dismissedNotifIds.includes(notifId)) {
            notifs.push({ id: notifId, type: 'success', title: 'Pesanan Selesai', desc: `SO ${so.id} telah selesai diproduksi dan lunas.`, targetPath: `/erp/so/detail/${so.id}`, isDismissible: true });
          }
        }

        const invoice = invoices.find(inv => inv.soNumber === so.soNumber);
        if (invoice) {
          const invPayments = payments.filter(p => p.invoiceId === invoice.id);
          const latestPayment = invPayments[invPayments.length - 1];
          if (latestPayment && latestPayment.status === "REJECTED") {
            notifs.push({ id: `pay-rej-${latestPayment.id}`, type: 'alert', title: 'Pembayaran Ditolak', desc: `Laporan pembayaran Invoice ${invoice.invoiceNumber} ditolak Finance. Harap unggah ulang.`, targetPath: `/erp/so/detail/${so.id}` });
          }
          if (latestPayment && latestPayment.status === "VERIFIED") {
            const notifId = `pay-ver-${latestPayment.id}`;
            if (!dismissedNotifIds.includes(notifId)) {
              notifs.push({ id: notifId, type: 'success', title: 'Pembayaran Diverifikasi', desc: `Pembayaran Invoice ${invoice.invoiceNumber} telah diverifikasi Finance.`, targetPath: `/erp/so/detail/${so.id}`, isDismissible: true });
            }
          }
        }
      });
    } else if (role === 'Engineering' || role === 'Engineering Supervisor') {
      const isSpv = role === 'Engineering Supervisor' || currentUser.username === 'eng_spv';
      
      const isRelevant = (assignedToId: string | null | undefined) => {
        if (isSpv) return !assignedToId || assignedToId === currentUser.id;
        return assignedToId === currentUser.id;
      };

      salesOrders.filter(so => so.status === 'Pending Design' || so.backendDesignStatus === 'PendingDesign' || so.backendDesignStatus === 'RevisionRequired').forEach(so => {
        if (!isRelevant(so.designAssignedTo)) return;
        const isUnassigned = !so.designAssignedTo;
        const title = isUnassigned && isSpv ? 'Butuh Penugasan Desain' : 'Desain Baru Dibutuhkan';
        const desc = isUnassigned && isSpv ? `SO ${so.id} belum ditugaskan ke engineer.` : `SO ${so.id} menunggu desain dan BOM.`;
        notifs.push({ id: so.id, type: 'warning', title, desc, targetPath: '/erp/engineer-tasks' });
      });
      
      if (isSpv) {
        salesOrders.filter(so => so.backendDesignStatus === 'WaitingApproval').forEach(so => {
          notifs.push({ id: so.id, type: 'warning', title: 'Desain Butuh Review', desc: `SO ${so.id} menunggu approval Engineering Supervisor.`, targetPath: '/erp/engineer-tasks' });
        });
      }

      salesOrders.filter(so => so.status === 'Ready for Production').forEach(so => {
        if (!isRelevant(so.assignedTo)) return;
        const isUnassigned = !so.assignedTo;
        const isReturnedToSpv = isUnassigned && !!so.rejectionReason;
        const title = isReturnedToSpv ? 'SO Dikembalikan ke SPV' : (isUnassigned && isSpv ? 'Butuh Penugasan Produksi' : 'Siap Diproduksi');
        const desc = isReturnedToSpv ? `SO ${so.id} dikembalikan oleh operator: "${so.rejectionReason}"` : (isUnassigned && isSpv ? `SO ${so.id} belum ditugaskan ke pekerja.` : `SO ${so.id} siap untuk mulai diproduksi.`);
        notifs.push({ id: so.id, type: isReturnedToSpv ? 'alert' : 'info', title, desc, targetPath: '/erp/production' });
      });

      salesOrders.filter(so => so.status === 'QC').forEach(so => {
        if (!isSpv) return;
        notifs.push({ id: so.id, type: 'alert', title: 'Menunggu QC', desc: `SO ${so.id} menunggu proses Quality Control.`, targetPath: '/erp/engineer-qc' });
      });

      purchasingRequests.forEach(pr => {
        if (pr.status === 'Selesai' && pr.requestedBy === currentUser.name) {
          const notifId = `pr-received-${pr.id}`;
          if (!dismissedNotifIds.includes(notifId)) {
            notifs.push({ 
              id: notifId, 
              type: 'success', 
              title: 'Material Diterima', 
              desc: `Material untuk ${pr.id} telah diterima oleh gudang.`, 
              targetPath: '/erp/engineer-purchasing',
              isDismissible: true
            });
          }
        }
      });
    } else if (role === 'Purchasing') {
      purchasingRequests.forEach(pr => {
        const activeItems = pr.items?.filter((item: any) => item.purchaseStatus !== "Rejected") || [];
        const isReadyForFinance = activeItems.length > 0 && activeItems.every((i: any) => !!i.supplierName && ((i.totalPrice || 0) > 0 || (i.estimatedPrice || 0) > 0));
        const hasUnorderedItems = activeItems.some((item: any) => item.purchaseStatus !== "Ordered" && item.purchaseStatus !== "Received");

        if (pr.backendStatus === 'SupervisorApproved' && !isReadyForFinance && hasUnorderedItems) {
          notifs.push({ id: pr.id, type: 'warning', title: 'Isi Harga MR', desc: `MR ${pr.id} telah disetujui Supervisor. Harap isi estimasi harga dan pilih supplier.`, targetPath: `/erp/purchasing/requests/${pr.id}` });
        } else if (pr.backendStatus === 'FinanceApproved' && hasUnorderedItems) {
          notifs.push({ id: pr.id, type: 'success', title: 'MR Disetujui Finance', desc: `MR ${pr.id} disetujui. Segera rilis PO.`, targetPath: `/erp/purchasing/create?reqId=${pr.id}` });
        }
      });
    } else if (role === 'Finance') {
      salesOrders.filter(so => {
        if (so.status === 'Waiting Pricing' || so.backendStatus === 'Waiting Pricing') return true;
        const hasInvoice = invoices.some(inv => inv.soNumber === so.soNumber);
        return so.backendDesignStatus === "Approved"
          && so.status !== "Waiting Payment" && so.backendStatus !== "Waiting Payment"
          && so.status !== "Completed" && so.backendStatus !== "Completed"
          && !hasInvoice;
      }).forEach(so => {
        notifs.push({ id: so.id, type: 'warning', title: 'Permintaan Harga', desc: `Buat Invoice untuk ${so.id}.`, targetPath: '/erp/finance/costing' });
      });
      payments.filter(p => p.status === 'PENDING').forEach(payment => {
        notifs.push({ id: payment.id, type: 'info', title: 'Verifikasi Pembayaran', desc: `Pembayaran untuk Invoice ${payment.invoiceNumber} menunggu verifikasi.`, targetPath: '/erp/finance/payment-verification' });
      });
      purchasingRequests.filter(pr => pr.backendStatus === 'SupervisorApproved').forEach(pr => {
        notifs.push({ id: pr.id, type: 'alert', title: 'Persetujuan Anggaran', desc: `Purchase Request ${pr.id} menunggu persetujuan anggaran.`, targetPath: '/erp/finance/approval-po' });
      });
    } else if (role === 'Admin') {
      purchasingRequests.filter(pr => pr.status === 'Pending').forEach(pr => {
        notifs.push({ id: pr.id, type: 'alert', title: 'MR Butuh Approval', desc: `MR ${pr.id} butuh persetujuan segera.`, targetPath: '/erp/purchasing/requests' });
      });
    }
    return notifs;
  }, [currentUser, salesOrders, purchasingRequests, dismissedNotifIds, invoices, payments]);

  return notifications;
}
