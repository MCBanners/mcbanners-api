export interface SpriteNode {
  readonly type: "sprite";
  readonly x: number;
  readonly y: number;
  /** Asset manifest key — sprites always reference bundled assets. */
  readonly assetKey: string;
  readonly width: number;
  readonly height: number;
}
//# sourceMappingURL=sprite-node.d.ts.map
