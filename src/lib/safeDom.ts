declare global {
  interface Window {
    __safeDomGuardsInstalled__?: boolean;
  }
}

export function installSafeDomGuards() {
  if (typeof window === "undefined" || window.__safeDomGuardsInstalled__) {
    return;
  }

  const originalRemoveChild = Node.prototype.removeChild;
  const originalInsertBefore = Node.prototype.insertBefore;

  Node.prototype.removeChild = function <T extends Node>(child: T) {
    if (!child || child.parentNode !== this) {
      return child;
    }

    try {
      return originalRemoveChild.call(this, child) as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") {
        console.warn("Ignored DOM removeChild mismatch", { parent: this, child, error });
        return child;
      }

      throw error;
    }
  };

  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode) as T;
    }

    try {
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") {
        console.warn("Ignored DOM insertBefore mismatch", { parent: this, newNode, referenceNode, error });
        return this.appendChild(newNode) as T;
      }

      throw error;
    }
  };

  window.__safeDomGuardsInstalled__ = true;
}
