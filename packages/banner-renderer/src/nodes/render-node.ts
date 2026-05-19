import type { TextNode } from "./text-node";
import type { WrappedTextNode } from "./wrapped-text-node";
import type { ImageNode } from "./image-node";
import type { SpriteNode } from "./sprite-node";
import type { DebugNode } from "./debug-node";
import type { FillRectNode } from "./fill-rect-node";

export type RenderNode =
  | TextNode
  | WrappedTextNode
  | ImageNode
  | SpriteNode
  | DebugNode
  | FillRectNode;

export type RenderNodeType = RenderNode["type"];
