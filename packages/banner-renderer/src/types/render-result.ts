export interface RenderResult {
  readonly format: "png" | "jpg";
  readonly bytes: Buffer;
}
