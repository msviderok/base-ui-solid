import type { FloatingEvents, FloatingNodeType } from '../types';
import { createEventEmitter } from '../utils/createEventEmitter';

/**
 * Stores and manages floating elements in a tree structure.
 * This is a backing store for the `FloatingTree` component.
 */
export class FloatingTreeStore {
  public readonly nodesRef: Array<FloatingNodeType> = [];

  public readonly events: FloatingEvents = createEventEmitter();

  public addNode(node: FloatingNodeType) {
    this.nodesRef.push(node);
  }

  public removeNode(node: FloatingNodeType) {
    const index = this.nodesRef.findIndex((n) => n === node);
    if (index !== -1) {
      this.nodesRef.splice(index, 1);
    }
  }
}
