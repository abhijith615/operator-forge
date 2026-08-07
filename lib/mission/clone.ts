import type { WorldState } from "@/types/world";

/**
 * A mutable draft of the world. Every reducer works on one of these rather than
 * mutating shared state, so React always sees a new reference and the pure
 * engine stays replayable.
 */
export function cloneWorld(world: WorldState): WorldState {
  return {
    ...world,
    orders: world.orders.map((order) => ({ ...order })),
    workers: world.workers.map((worker) => ({ ...worker })),
    riders: world.riders.map((rider) => ({ ...rider })),
    inventory: world.inventory.map((item) => ({ ...item })),
    complaints: world.complaints.map((complaint) => ({ ...complaint })),
    impairments: world.impairments.map((impairment) => ({ ...impairment })),
    metrics: { ...world.metrics },
    weather: { ...world.weather },
  };
}
