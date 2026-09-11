import type { InventoryStatus, Material, StockSnapshot } from './types';

export function getInventoryStatus(material: Material): InventoryStatus {
  if (!material.counted || material.currentQuantity === null) return 'pending';
  if (material.currentQuantity <= material.minimumQuantity) return 'critical';
  if (material.currentQuantity < material.idealQuantity) return 'reposition';
  return 'ok';
}

export function getReplenishmentQuantity(material: Material): number {
  if (material.currentQuantity === null) return 0;
  return Math.max(0, material.idealQuantity - material.currentQuantity);
}

export function getStockSnapshot(materials: Material[]): StockSnapshot {
  return materials.reduce<StockSnapshot>((snapshot, material) => {
    snapshot.totalMaterials += 1;
    snapshot[getInventoryStatus(material)] += 1;
    return snapshot;
  }, { totalMaterials: 0, critical: 0, reposition: 0, ok: 0, pending: 0 });
}

export function canDecreaseStock(material: Material, quantity: number): boolean {
  return material.currentQuantity !== null && Number.isInteger(quantity) && quantity > 0 && material.currentQuantity - quantity >= 0;
}
