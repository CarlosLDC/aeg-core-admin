export type InventoryBoxResponse = {
  id: number;
  boxNumber: number;
  observations: string | null;
  createdAt: string;
  printerCount: number;
};

export type InventoryBoxRequest = {
  boxNumber: number;
  observations: string | null;
};
