import type { Action } from './types';
import { createEventDispatcher } from 'svelte';
/**
 * Creates panStart, panMove, panEnd events so you can drag elements.
 *
 * Demo: https://svelte.dev/tutorial/actions
 *
 * @example
 * ```svelte
 * <div use:pannable={true} on:panstart on:panmove on:panend>
 * ```
 */

type PointerEventTag =
  | 'pointercancel'
  | 'pointerdown'
  | 'pointerenter'
  | 'pointerleave'
  | 'pointermove'
  | 'pointerout'
  | 'pointerover'
  | 'pointerup';

type EventTag = keyof HTMLElementEventMap;
type EventFromEventTag<K extends EventTag> = HTMLElementEventMap[K];

interface TaggedEvent<K extends EventTag, El extends HTMLElement> {
  tag: K;
  element: El;
  event: HTMLElementEventMap[K];
}
const coordinates = <El extends HTMLElement>({
  element,
  event,
  tag,
}: TaggedEvent<PointerEventTag, El>) => {
  const rect = element.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  return {
    ndc: {
      x: (x / rect.width) * 2 - 1,
      y: (y / rect.height) * -2 + 1,
    },
    pixel: {
      x: x,
      y: y,
    },
  };
};

const pinchOffset = <El extends HTMLElement>([point1, point2]: [
  CacheEntry<El>,
  CacheEntry<El>
]) => {
  const { x: x1_i, y: y1_i } = coordinates(point1[point1.length - 2]).ndc;
  const { x: x2_i, y: y2_i } = coordinates(point1[point2.length - 2]).ndc;
  const { x: x1_f, y: y1_f } = coordinates(point1[point1.length - 1]).ndc;
  const { x: x2_f, y: y2_f } = coordinates(point2[point2.length - 1]).ndc;

  return (
    Math.sqrt((x2_f - x1_f) * (x2_f - x1_f) + (y2_f - y1_f) * (y2_f - y1_f)) -
    Math.sqrt((x2_i - x1_i) * (x2_i - x1_i) + (y2_i - y1_i) * (y2_i - y1_i))
  );
};

const pointerDifference = <El extends HTMLElement>(
  pointer1: TaggedEvent<PointerEventTag, El>,
  pointer2: TaggedEvent<PointerEventTag, El>
) => {
  const pointer1Coords = coordinates(pointer1);
  const pointer2Coords = coordinates(pointer2);

  return {
    dt: pointer2.event.timeStamp - pointer1.event.timeStamp,
    dP_Normal: pointer2.event.pressure - pointer1.event.pressure,
    dP_Tangential:
      pointer2.event.tangentialPressure - pointer1.event.tangentialPressure,
    dA:
      pointer2.event.width * pointer2.event.height -
      pointer1.event.width * pointer1.event.height,
    dTiltX: pointer2.event.tiltX - pointer1.event.tiltX,
    dTiltY: pointer2.event.tiltY - pointer1.event.tiltY,
    dTwist: pointer2.event.twist - pointer1.event.twist,
    dNormalisedDeviceCoords: {
      dx: pointer2Coords.ndc.x - pointer1Coords.ndc.x,
      dy: pointer2Coords.ndc.y - pointer1Coords.ndc.y,
    },
    dPixelCoords: {
      dx: pointer2Coords.pixel.x - pointer1Coords.pixel.x,
      dy: pointer2Coords.pixel.y - pointer1Coords.pixel.y,
    },
  };
};
export type PointerDifference = ReturnType<typeof pointerDifference>;

const handleMultipointerpanmove = <El extends HTMLElement>(
  cache: Map<string, CacheEntry<El>>
) => {
  return Array.from(cache)
    .map(([key, value]) => value)
    .filter((arr) => arr.length === 1)
    .map(
      (cacheEntry) =>
        new CustomEvent('multipointerpanmove', {
          detail: {
            delta: pointerDifference(
              cacheEntry[cacheEntry.length - 2],
              cacheEntry[cacheEntry.length - 1]
            ),
          },
        })
    );
};

type CacheEntry<El extends HTMLElement> = Array<
  TaggedEvent<PointerEventTag, El>
>;

const handleIncomingPointerEventsStream = <El extends HTMLElement>(
  cache: Map<string, CacheEntry<El>>,
  item: TaggedEvent<PointerEventTag, El>
): Map<string, CacheEntry<El>> => {
  switch (item.tag) {
    case 'pointerdown':
      cache.set(`${item.event.pointerId}`, [item, item]);
      return cache;
    case 'pointermove': {
      const cacheEntry = cache.get(`${item.event.pointerId}`);
      if (cacheEntry) {
        cache.set(`${item.event.pointerId}`, [...cacheEntry, item]);
      }
      return cache;
    }
    case 'pointerup':
      cache.delete(`${item.event.pointerId}`);
      return cache;
    default:
      return cache;
  }
};

export const pannable: Action = (node) => {
  let x: number;
  let y: number;

  const cache = new Map<string, CacheEntry<typeof node>>();

  function handle_pointerdown(event: EventFromEventTag<'pointerdown'>) {
    x = event.clientX;
    y = event.clientY;

    const taggedEv: TaggedEvent<'pointerdown', typeof node> = {
      tag: 'pointerdown',
      element: node,
      event: event,
    };
    handleIncomingPointerEventsStream(cache, taggedEv);

    node.dispatchEvent(
      new CustomEvent('panstart', {
        detail: { x, y },
      })
    );

    window.addEventListener('pointermove', handle_pointermove);
    window.addEventListener('pointerup', handle_pointerup);
  }

  function handle_pointermove(event: EventFromEventTag<'pointermove'>) {
    const dx = event.clientX - x;
    const dy = event.clientY - y;
    x = event.clientX;
    y = event.clientY;

    const taggedEv: TaggedEvent<'pointermove', typeof node> = {
      tag: 'pointermove',
      element: node,
      event: event,
    };
    handleIncomingPointerEventsStream(cache, taggedEv);

    node.dispatchEvent(
      new CustomEvent('panmove', {
        detail: { x, y, dx, dy },
      })
    );

    const multipointerpanmoves = handleMultipointerpanmove(cache);
    multipointerpanmoves.forEach((multipointerpanmove) =>
      node.dispatchEvent(multipointerpanmove)
    );
  }

  function handle_pointerup(event: EventFromEventTag<'pointerup'>) {
    x = event.clientX;
    y = event.clientY;

    const taggedEv: TaggedEvent<'pointerup', typeof node> = {
      tag: 'pointerup',
      element: node,
      event: event,
    };
    handleIncomingPointerEventsStream(cache, taggedEv);

    node.dispatchEvent(
      new CustomEvent('panend', {
        detail: { x, y },
      })
    );

    window.removeEventListener('pointermove', handle_pointermove);
    window.removeEventListener('pointerup', handle_pointerup);
  }

  node.addEventListener('pointerdown', handle_pointerdown);

  return {
    destroy() {
      node.removeEventListener('pointerdown', handle_pointerdown);
    },
  };
};
