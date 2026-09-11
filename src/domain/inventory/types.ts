export type InventoryStatus = 'critical' | 'reposition' | 'ok' | 'pending';

export interface Material {
  id: string;
  name: string;
  area: string;
  subgroup: string;
  unit: string;
  currentQuantity: number | null;
  minimumQuantity: number;
  idealQuantity: number;
  counted: boolean;
}

export interface Movement {
  id: string;
  materialId: string;
  type: 'entry' | 'exit' | 'adjustment';
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  occurredAt: string;
  note?: string;
}

export interface StockSnapshot {
  totalMaterials: number;
  critical: number;
  reposition: number;
  ok: number;
  pending: number;
}
