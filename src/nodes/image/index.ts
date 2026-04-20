import { Image as ImageIcon } from "lucide-react";
import type { ImageProps } from "@/types/layout";
import { register } from "../registry";
import { ImageLeaf } from "./ImageLeaf";
import { ImageInspector } from "./ImageInspector";

register<ImageProps>({
  kind: "image",
  label: "Image",
  icon: ImageIcon,
  isContainer: false,
  inPalette: true,
  defaultProps: () => ({ fit: "cover" }),
  Leaf: ImageLeaf,
  Inspector: ImageInspector,
  exportMarkdown: (node) => {
    const p = node.props as ImageProps;
    return `[Image: ${p.alt ?? (p.src ? "attached" : "placeholder")}]`;
  },
  exportMermaid: (node) => {
    const p = node.props as ImageProps;
    return `Image${p.alt ? `: ${p.alt}` : ""}`;
  },
});
