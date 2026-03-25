const BASE_Z = 100;

export class ZManager {
  private elements: HTMLElement[] = [];

  register(el: HTMLElement): void {
    if (!this.elements.includes(el)) {
      this.elements.push(el);
      this.assignZ(el, this.elements.length * 10 + BASE_Z);
    }
  }

  unregister(el: HTMLElement): void {
    const idx = this.elements.indexOf(el);
    if (idx !== -1) {
      this.elements.splice(idx, 1);
    }
  }

  bringToFront(el: HTMLElement): void {
    const idx = this.elements.indexOf(el);
    if (idx !== -1) {
      this.elements.splice(idx, 1);
    }
    this.elements.push(el);
    this.reindex();
  }

  sendToBack(el: HTMLElement): void {
    const idx = this.elements.indexOf(el);
    if (idx !== -1) {
      this.elements.splice(idx, 1);
    }
    this.elements.unshift(el);
    this.reindex();
  }

  getZ(el: HTMLElement): number {
    const idx = this.elements.indexOf(el);
    if (idx === -1) return BASE_Z;
    return idx * 10 + BASE_Z;
  }

  setZ(el: HTMLElement, z: number): void {
    this.assignZ(el, z);
  }

  private reindex(): void {
    for (let i = 0; i < this.elements.length; i++) {
      this.assignZ(this.elements[i], i * 10 + BASE_Z);
    }
  }

  private assignZ(el: HTMLElement, z: number): void {
    el.style.zIndex = String(z);
  }
}
