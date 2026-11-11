import { describe, it, expect } from 'vitest';
import { formatDocNumber, getDocLabel, isActiveQuotationEntry, isQuotationEntry, mapBomsPerItem, mapQuotationDto, mapSalesOrderDto } from './dataMappers';
import { SalesOrderDto } from '../../../services/salesApi';

describe('dataMappers - mapBomsPerItem', () => {
  it('correctly parses JSON array from notes into bomsPerItem', () => {
    const order: SalesOrderDto = {
      items: [
        {
          id: 'ITEM-1',
          notes: '[{"name": "Kayu", "spec": "100x50", "quantity": 10, "inventoryItemId": "MAT-005"}]',
        },
        {
          id: 'ITEM-2',
          notes: 'Regular note, not JSON',
        }
      ]
    } as any;

    const result = mapBomsPerItem(order);

    expect(result['ITEM-1']).toHaveLength(1);
    expect(result['ITEM-1'][0].inventoryItemId).toBe('MAT-005');
    expect(result['ITEM-1'][0].spec).toBe('100x50');
    
    // Non-JSON notes should result in an empty array
    expect(result['ITEM-2']).toEqual([]);
  });

  it('handles empty notes, malformed JSON, and non-array JSON safely', () => {
    const order: SalesOrderDto = {
      items: [
        { id: 'ITEM-1', notes: undefined },
        { id: 'ITEM-2', notes: '[malformed json}' },
        { id: 'ITEM-3', notes: '{"this": "is an object, not array"}' }
      ]
    } as any;

    const result = mapBomsPerItem(order);

    expect(result['ITEM-1']).toEqual([]);
    expect(result['ITEM-2']).toEqual([]);
    expect(result['ITEM-3']).toEqual([]);
  });
});

describe('isActiveQuotationEntry', () => {
  it('keeps a won quotation available until it has a conversion reference', () => {
    expect(isActiveQuotationEntry({ isQuotation: true, backendStatus: 'won' } as any)).toBe(true);
  });

  it('hides a converted won quotation by its SalesOrder ID or number', () => {
    expect(isActiveQuotationEntry({ isQuotation: true, backendStatus: 'won', convertedSalesOrderId: 'so-guid' } as any)).toBe(false);
    expect(isActiveQuotationEntry({ isQuotation: true, backendStatus: 'won', convertedSalesOrderNumber: 'SO-2026-001' } as any)).toBe(false);
  });

  it('preserves the backend conversion reference when mapping a Quotation DTO', () => {
    const mapped = mapQuotationDto({
      id: 'quotation-guid', quotationNumber: 'QU-2026-001', status: 'won',
      convertedSalesOrderId: 'sales-order-guid', convertedSalesOrderNumber: 'SO-2026-001',
      items: [], bomItems: [], createdAtUtc: '', deadline: '', designSource: 'Engineering',
    } as any);

    expect(mapped.convertedSalesOrderId).toBe('sales-order-guid');
    expect(isActiveQuotationEntry(mapped)).toBe(false);
  });

  it('keeps all active quotation workflow statuses visible', () => {
    const statuses = [
      'draft', 'pending_design', 'design_review', 'client_design_approval',
      'waiting_pricing', 'client_price_approval', 'won', 'lost',
    ];

    statuses.forEach(status => {
      expect(isActiveQuotationEntry({ isQuotation: true, backendStatus: status } as any)).toBe(true);
    });
  });
});

describe('SalesOrder vs Quotation mapping and classification', () => {
  it('preserves SO number and classifies mapped SalesOrder DTOs as non-quotation across all statuses', () => {
    const preProductionConfigs = [
      { status: 'Pending Design', designStatus: 'PendingDesign', expectedStatus: 'Pending Design' },
      { status: 'Waiting Pricing', designStatus: 'Approved', expectedStatus: 'Waiting Pricing' },
      { status: 'Waiting Spv Approval', designStatus: 'WaitingApproval', expectedStatus: 'Waiting Spv Approval' },
      { status: 'Revision Required', designStatus: 'RevisionRequired', expectedStatus: 'Revision Required' },
      { status: 'Waiting Client Approval', designStatus: 'Approved', expectedStatus: 'Waiting Client Approval' },
      { status: 'WaitingPayment', designStatus: 'Approved', expectedStatus: 'Waiting Payment' },
    ];

    preProductionConfigs.forEach(({ status, designStatus, expectedStatus }) => {
      const mapped = mapSalesOrderDto({
        id: '11111111-2222-3333-4444-555555555555',
        soNumber: 'SO-2026-0042',
        customerId: 'cust-guid',
        customerCode: 'CUST-001',
        customerName: 'PT Maju Jaya',
        soDate: '2026-08-01',
        status,
        designStatus,
        productionStatus: 'NotStarted',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productPartNumber: 'PART-001',
            productDescription: 'Precision Shaft',
            qty: 10,
            unitPrice: 50000,
          },
        ],
      } as any);

      expect(mapped.id).toBe('SO-2026-0042');
      expect(mapped.soNumber).toBe('SO-2026-0042');
      expect(mapped.backendId).toBe('11111111-2222-3333-4444-555555555555');
      expect(mapped.isQuotation).toBe(false);
      expect(mapped.status).toBe(expectedStatus);
      expect(isQuotationEntry(mapped)).toBe(false);
      expect(isActiveQuotationEntry(mapped)).toBe(false);
      expect(formatDocNumber(mapped.id, mapped.status, mapped.isQuotation)).toBe('SO-2026-0042');
      expect(getDocLabel(mapped)).toBe('No. SO');
    });
  });

  it('classifies mapped Quotation DTOs as quotation entries with QU numbers and labels', () => {
    const mappedQuotation = mapQuotationDto({
      id: '22222222-3333-4444-5555-666666666666',
      quotationNumber: 'QU-2026-0015',
      customerId: 'cust-guid',
      customerCode: 'CUST-001',
      customerName: 'PT Maju Jaya',
      status: 'pending_design',
      designSource: 'Engineering',
      engineeringReviewRequired: true,
      items: [{ id: 'q-item-1', productName: 'Custom Gear', quantity: 4, unit: 'pcs' }],
      bomItems: [],
      revisions: [],
      createdAtUtc: '2026-08-01T00:00:00Z',
      updatedAtUtc: '2026-08-01T00:00:00Z',
    } as any);

    expect(mappedQuotation.id).toBe('QU-2026-0015');
    expect(mappedQuotation.isQuotation).toBe(true);
    expect(isQuotationEntry(mappedQuotation)).toBe(true);
    expect(isActiveQuotationEntry(mappedQuotation)).toBe(true);
    expect(formatDocNumber(mappedQuotation.id, mappedQuotation.status, mappedQuotation.isQuotation)).toBe('QU-2026-0015');
    expect(getDocLabel(mappedQuotation)).toBe('No. Quotation');
  });

  it('routes newly created SalesOrders to the SO list and Quotations to the Quotation list without cross-contamination', () => {
    const newSalesOrderPendingDesign = mapSalesOrderDto({
      id: 'so-guid-1',
      soNumber: 'SO-2026-0101',
      customerId: 'cust-1',
      customerCode: 'CUST-001',
      customerName: 'PT Maju Jaya',
      soDate: '2026-08-01',
      status: 'Pending Design',
      designStatus: 'PendingDesign',
      items: [{ id: 'i1', productId: 'p1', productPartNumber: 'P-1', productDescription: 'Custom Shaft', qty: 2, unitPrice: 0 }],
    } as any);

    const newSalesOrderWaitingPricing = mapSalesOrderDto({
      id: 'so-guid-2',
      soNumber: 'SO-2026-0102',
      customerId: 'cust-1',
      customerCode: 'CUST-001',
      customerName: 'PT Maju Jaya',
      soDate: '2026-08-01',
      status: 'Waiting Pricing',
      designStatus: 'Approved',
      items: [{ id: 'i2', productId: 'p2', productPartNumber: 'P-2', productDescription: 'Repeat Gear', qty: 5, unitPrice: 100000 }],
    } as any);

    const convertedSalesOrder = mapSalesOrderDto({
      id: 'so-guid-3',
      soNumber: 'SO-2026-0103',
      customerId: 'cust-1',
      customerCode: 'CUST-001',
      customerName: 'PT Maju Jaya',
      soDate: '2026-08-01',
      status: 'WaitingPayment',
      designStatus: 'Approved',
      isCostingCompleted: true,
      estimatedAmount: 500000,
      items: [{ id: 'i3', productId: 'p3', productPartNumber: 'P-3', productDescription: 'Converted Fixture', qty: 1, unitPrice: 500000 }],
    } as any);

    const activeQuotation = mapQuotationDto({
      id: 'quo-guid-1',
      quotationNumber: 'QU-2026-0050',
      customerId: 'cust-1',
      customerCode: 'CUST-001',
      customerName: 'PT Maju Jaya',
      status: 'pending_design',
      designSource: 'Engineering',
      engineeringReviewRequired: true,
      items: [{ id: 'qi1', productName: 'New Custom Part', quantity: 3, unit: 'pcs' }],
      bomItems: [],
      revisions: [],
      createdAtUtc: '2026-08-01T00:00:00Z',
      updatedAtUtc: '2026-08-01T00:00:00Z',
    } as any);

    const convertedQuotation = mapQuotationDto({
      id: 'quo-guid-2',
      quotationNumber: 'QU-2026-0051',
      customerId: 'cust-1',
      customerCode: 'CUST-001',
      customerName: 'PT Maju Jaya',
      status: 'won',
      convertedSalesOrderId: 'so-guid-3',
      convertedSalesOrderNumber: 'SO-2026-0103',
      designSource: 'Engineering',
      engineeringReviewRequired: true,
      items: [{ id: 'qi2', productName: 'Converted Fixture', quantity: 1, unit: 'pcs' }],
      bomItems: [],
      revisions: [],
      createdAtUtc: '2026-08-01T00:00:00Z',
      updatedAtUtc: '2026-08-01T00:00:00Z',
    } as any);

    const mappedSOList = [newSalesOrderPendingDesign, newSalesOrderWaitingPricing, convertedSalesOrder];
    const mappedQuoList = [activeQuotation, convertedQuotation];

    const existingSOBackendIds = new Set(mappedSOList.map(o => o.backendId).filter(Boolean));
    const filteredQuotations = mappedQuoList.filter(q =>
      isActiveQuotationEntry(q) && (!q.backendId || !existingSOBackendIds.has(q.backendId))
    );
    const mergedSalesOrders = [...mappedSOList, ...filteredQuotations];

    const soTabItems = mergedSalesOrders.filter(o => !isQuotationEntry(o));
    const quotationTabItems = mergedSalesOrders.filter(o => isQuotationEntry(o));

    expect(soTabItems.map(o => o.id)).toEqual(['SO-2026-0101', 'SO-2026-0102', 'SO-2026-0103']);
    expect(quotationTabItems.map(o => o.id)).toEqual(['QU-2026-0050']);
  });

  it('preserves backendId, backendStatus, backendDesignStatus, status, designId, notes, items, and isQuotation across repeated mapSalesOrderDto calls', () => {
    const scenarios = [
      {
        label: 'Waiting Pricing + Approved design (from Draft)',
        dtoStatus: 'Draft',
        designStatus: 'Approved',
        designReference: 'https://drawings.example.com/approved.pdf',
        expectedStatus: 'Waiting Pricing',
        expectedDesignId: undefined,
      },
      {
        label: 'Waiting Pricing + Approved design (explicit)',
        dtoStatus: 'Waiting Pricing',
        designStatus: 'Approved',
        designReference: 'INTERNAL_DESIGN',
        expectedStatus: 'Waiting Pricing',
        expectedDesignId: 'none',
      },
      {
        label: 'Pending Design',
        dtoStatus: 'Draft',
        designStatus: 'PendingDesign',
        designReference: 'https://drawings.example.com/customer.pdf',
        expectedStatus: 'Pending Design',
        expectedDesignId: 'customer',
      },
      {
        label: 'Revision Required',
        dtoStatus: 'Draft',
        designStatus: 'RevisionRequired',
        designReference: 'https://drawings.example.com/rev1.pdf',
        expectedStatus: 'Revision Required',
        expectedDesignId: undefined,
      },
      {
        label: 'Waiting Spv Approval',
        dtoStatus: 'Draft',
        designStatus: 'WaitingApproval',
        designReference: 'https://drawings.example.com/spv.pdf',
        expectedStatus: 'Waiting Spv Approval',
        expectedDesignId: undefined,
      },
      {
        label: 'Waiting Payment',
        dtoStatus: 'WaitingPayment',
        designStatus: 'Approved',
        designReference: 'INTERNAL_DESIGN',
        expectedStatus: 'Waiting Payment',
        expectedDesignId: 'none',
      },
    ];

    scenarios.forEach(({ dtoStatus, designStatus, designReference, expectedStatus, expectedDesignId }) => {
      const rawDto: SalesOrderDto = {
        id: '99999999-8888-7777-6666-555555555555',
        soNumber: 'SO-2026-0777',
        customerId: 'cust-guid-777',
        customerCode: 'CUST-777',
        customerName: 'PT Presisi Utama',
        soDate: '2026-09-10',
        targetDate: '2026-09-25',
        status: dtoStatus,
        designStatus,
        designReference,
        productionStatus: 'NotStarted',
        items: [
          {
            id: 'item-777',
            productId: 'prod-777',
            productPartNumber: 'SHF-777',
            productDescription: 'Hardened Drive Shaft',
            qty: 8,
            unitPrice: 125000,
            notes: '[{"id":"mat-1","name":"S45C","quantity":8,"unit":"PCS"}] Heat treat HRC 55',
          },
        ],
      };

      const once = mapSalesOrderDto(rawDto);
      const twice = mapSalesOrderDto(once as any);

      expect(twice.id).toBe('SO-2026-0777');
      expect(twice.soNumber).toBe('SO-2026-0777');
      expect(twice.backendId).toBe('99999999-8888-7777-6666-555555555555');
      expect(twice.backendStatus).toBe(dtoStatus);
      expect(twice.backendDesignStatus).toBe(designStatus);
      expect(twice.status).toBe(expectedStatus);
      expect(twice.designId).toBe(expectedDesignId);
      expect(twice.notes).toBe('Heat treat HRC 55');
      expect(twice.isQuotation).toBe(false);
      expect(twice.quantity).toBe(8);
      expect(twice.items).toHaveLength(1);
      expect(twice.items?.[0]).toMatchObject({
        id: 'item-777',
        productId: 'prod-777',
        productName: 'Hardened Drive Shaft',
        partNumber: 'SHF-777',
        productPartNumber: 'SHF-777',
        quantity: 8,
        unitPrice: 125000,
      });
      expect(twice).toEqual(once);
    });

    const wonQuotation = mapQuotationDto({
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      quotationNumber: 'QU-2026-0888',
      customerId: 'cust-guid-888',
      customerCode: 'CUST-888',
      customerName: 'PT Karya Teknik',
      status: 'won',
      designSource: 'Engineering',
      engineeringReviewRequired: true,
      items: [{ id: 'q-item-888', productName: 'Precision Jig', quantity: 2, unit: 'pcs', unitPrice: 750000 }],
      bomItems: [],
      revisions: [],
      createdAtUtc: '2026-09-10T00:00:00Z',
      updatedAtUtc: '2026-09-10T00:00:00Z',
    } as any);

    expect(wonQuotation.id).toBe('QU-2026-0888');
    expect(wonQuotation.backendId).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(wonQuotation.backendStatus).toBe('won');
    expect(wonQuotation.status).toBe('Approved');
    expect(wonQuotation.isQuotation).toBe(true);
    expect(isQuotationEntry(wonQuotation)).toBe(true);
    expect(isActiveQuotationEntry(wonQuotation)).toBe(true);
  });

  it('preserves quotation identity, backendId, backendStatus, BOM, items, and status across repeated mapQuotationDto calls for all quotation workflow states', () => {
    const quotationStates = [
      { rawStatus: 'draft', expectedUiStatus: 'Pending Design', expectedCostingCompleted: false },
      { rawStatus: 'pending_design', expectedUiStatus: 'Pending Design', expectedCostingCompleted: false },
      { rawStatus: 'design_review', expectedUiStatus: 'Waiting Spv Approval', expectedCostingCompleted: false },
      { rawStatus: 'client_design_approval', expectedUiStatus: 'Waiting Client Approval', expectedCostingCompleted: false },
      { rawStatus: 'waiting_pricing', expectedUiStatus: 'Waiting Pricing', expectedCostingCompleted: false },
      { rawStatus: 'client_price_approval', expectedUiStatus: 'Waiting Client Approval', expectedCostingCompleted: true },
      { rawStatus: 'won', expectedUiStatus: 'Approved', expectedCostingCompleted: true },
      { rawStatus: 'lost', expectedUiStatus: 'Cancelled', expectedCostingCompleted: false },
    ];

    quotationStates.forEach(({ rawStatus, expectedUiStatus, expectedCostingCompleted }) => {
      const rawQuotationDto = {
        id: '12121212-3434-5656-7878-909090909090',
        quotationNumber: 'QU-2026-0999',
        customerId: 'cust-guid-999',
        customerCode: 'CUST-999',
        customerName: 'PT Presisi Nusantara',
        customerEmail: 'purchasing@presisi.co.id',
        deadline: '2026-10-15',
        notes: 'Anodized black finish',
        status: rawStatus,
        designSource: 'Engineering',
        engineeringReviewRequired: true,
        engineeringApprovedAtUtc: '2026-09-12T08:00:00Z',
        assignedEngineerId: '90000000-0000-4000-8000-000000000002',
        assignedEngineerName: 'Eng Worker',
        designLink: 'https://cad.example.com/qu-999.dwg',
        estimatedAmount: 3000000,
        items: [
          {
            id: 'q-item-999',
            productId: 'prod-guid-999',
            productName: 'CNC Bracket',
            description: 'Tolerance +-0.02mm',
            quantity: 3,
            unit: 'PCS',
            customerImageUrl: 'https://img.example.com/ref.png',
          },
        ],
        bomItems: [
          {
            id: 'bom-999',
            itemCode: 'MAT-7075',
            name: 'Aluminum 7075 Plate',
            specification: '20mm x 200mm x 200mm',
            quantity: 3,
            unit: 'pcs',
          },
        ],
        revisions: [],
        createdAtUtc: '2026-09-10T10:00:00Z',
        updatedAtUtc: '2026-09-12T10:00:00Z',
      };

      const once = mapQuotationDto(rawQuotationDto as any);
      const twice = mapQuotationDto(once as any);

      expect(once.id).toBe('QU-2026-0999');
      expect(twice.id).toBe('QU-2026-0999');
      expect(twice.soNumber).toBe('QU-2026-0999');
      expect(twice.quotationNumber).toBe('QU-2026-0999');
      expect(twice.backendId).toBe('12121212-3434-5656-7878-909090909090');
      expect(twice.quotationId).toBe('12121212-3434-5656-7878-909090909090');
      expect(twice.backendStatus).toBe(rawStatus);
      expect(twice.backendDesignStatus).toBe(rawStatus);
      expect(twice.status).toBe(expectedUiStatus);
      expect(twice.isQuotation).toBe(true);
      expect(isQuotationEntry(twice)).toBe(true);
      expect(twice.isCostingCompleted).toBe(expectedCostingCompleted);
      expect(twice.designAssignedTo).toBe('90000000-0000-4000-8000-000000000002');
      expect(twice.designAssignedName).toBe('Eng Worker');
      expect(twice.designApprovedAt).toBe('2026-09-12');
      expect(twice.materials).toHaveLength(1);
      expect(twice.materials?.[0]).toMatchObject({
        id: 'bom-999',
        name: 'Aluminum 7075 Plate',
        specification: '20mm x 200mm x 200mm',
        quantity: 3,
        unit: 'pcs',
        code: 'MAT-7075',
      });
      expect(twice.items?.[0]).toMatchObject({
        id: 'q-item-999',
        productId: 'prod-guid-999',
        productName: 'CNC Bracket',
        quantity: 3,
        unitPrice: 1000000,
        unit: 'PCS',
        notes: 'Tolerance +-0.02mm',
      });
      expect(formatDocNumber(twice.id, twice.status, twice.isQuotation)).toBe('QU-2026-0999');
      expect(getDocLabel(twice)).toBe('No. Quotation');
      expect(twice).toEqual(once);
    });
  });

  it('maps converted Sales Order DTO with inherited engineer assignment and structured BOM from quotation conversion', () => {
    const convertedSoDto: any = {
      id: '33333333-4444-5555-6666-777777777777',
      soNumber: 'SO-2026-003',
      customerId: 'cust-003',
      customerCode: 'CUST-003',
      customerName: 'PT Bahagia Abadi',
      customerEmail: 'indah@abadi.com',
      customerDrawingUrl: '/engineering-drawings/color-pallete.jpeg',
      designReference: '/engineering-drawings/color-pallete.jpeg',
      designStatus: 'Approved',
      designApprovedAtUtc: '2026-11-11T10:00:00Z',
      soDate: '2026-11-11',
      targetDate: '2026-11-13',
      designWorkerUserId: '30000000-0000-0000-0000-000000000004',
      designWorkerName: 'Engineering User',
      status: 'WaitingPayment',
      productionStatus: 'Waiting',
      estimatedAmount: 400000,
      isCostingCompleted: true,
      createdAtUtc: '2026-11-11T10:05:00Z',
      updatedAtUtc: '2026-11-11T10:05:00Z',
      items: [
        {
          id: 'so-item-003',
          productId: 'prod-custom-003',
          productPartNumber: 'test2',
          productDescription: 'test2',
          qty: 2,
          unitPrice: 200000,
          notes: JSON.stringify([
            {
              id: 'quo-bom-11111111-2222-3333-4444-555555555555',
              code: 'MAT-001',
              itemCode: 'MAT-001',
              name: 'Bor 2mm',
              spec: 'HSS M2',
              specification: 'HSS M2',
              quantity: 20,
              unit: 'PCS',
              isCustomerMaterial: false,
            },
          ]),
        },
      ],
    };

    const mapped = mapSalesOrderDto(convertedSoDto);

    expect(mapped.id).toBe('SO-2026-003');
    expect(mapped.isQuotation).toBe(false);
    expect(mapped.status).toBe('Waiting Payment');
    expect(mapped.designAssignedTo).toBe('30000000-0000-0000-0000-000000000004');
    expect(mapped.designAssignedName).toBe('Engineering User');
    expect(mapped.materials).toHaveLength(1);
    expect(mapped.materials?.[0]).toMatchObject({
      code: 'MAT-001',
      name: 'Bor 2mm',
      spec: 'HSS M2',
      specification: 'HSS M2',
      quantity: 20,
      unit: 'PCS',
    });
    expect(mapped.bomsPerItem?.['so-item-003']).toHaveLength(1);
  });
});
