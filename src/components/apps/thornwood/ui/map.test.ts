import { describe, expect, it } from "vitest";
import { createGame } from "../engine/engine";
import { flags } from "../engine/room";
import { allRoomIds } from "../engine/world";
import { loadRoom } from "../engine/room";
import { FERNWHISTLE } from "../engine/rooms/fernwhistle";
import { MAP_ARROWS, MAP_BOX, cellRect, cellSeen, heroOnMap, knownAreas, mapLayout, openMap, pageMap, roomRect, roomSeen, type MapArea } from "./map";

const AREAS: MapArea[] = ["overworld", "hollow", "bramblekeep"];

describe("the map", () => {
  it("only knows about areas you've been to", () => {
    const game = createGame(1);
    expect(knownAreas(game)).toEqual(["overworld"]);
    game.flags.add(flags.seen("bramblekeep:1,3"));
    expect(knownAreas(game)).toEqual(["overworld", "bramblekeep"]);
  });

  it("opens on the area you're standing in and pages through the known ones", () => {
    const game = createGame(1);
    let view = openMap(game, "playing");
    expect(view.area).toBe("overworld");
    // Nowhere else to page to yet.
    expect(pageMap(view, game, 1)).toBe(view);

    game.flags.add(flags.seen("hollow:0,1")).add(flags.seen("bramblekeep:1,3"));
    view = pageMap(view, game, 1);
    expect(view.area).toBe("hollow");
    expect(pageMap(view, game, 1).area).toBe("bramblekeep");
    expect(pageMap(openMap(game, "paused"), game, -1).area).toBe("bramblekeep");
    expect(view.from).toBe("playing");
  });

  it("puts you at the front door when you're indoors", () => {
    const game = createGame(1);
    loadRoom(game, "interior:0,0");
    expect(openMap(game, "playing").area).toBe("overworld");
    const here = heroOnMap(game);
    expect(here.roomId).toBe("overworld:1,1");
    // Nana's door is the third column of Puddlebrook.
    expect(Math.floor(here.at.x / 16)).toBe(3);
    expect(knownAreas(game)).toEqual(["overworld"]);
  });

  it.each(AREAS)("lays out every room of %s inside the map box, without overlaps", (area) => {
    const layout = mapLayout(area);
    expect(layout.scale).toBeGreaterThanOrEqual(3);
    expect(layout.x).toBeGreaterThanOrEqual(MAP_BOX.x);
    expect(layout.y).toBeGreaterThanOrEqual(MAP_BOX.y);
    expect(layout.x + layout.w).toBeLessThanOrEqual(MAP_BOX.x + MAP_BOX.w);
    expect(layout.y + layout.h).toBeLessThanOrEqual(MAP_BOX.y + MAP_BOX.h);

    const rects = allRoomIds(area).map((id) => roomRect(layout, id));
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(layout.x);
      expect(r.y).toBeGreaterThanOrEqual(layout.y);
      expect(r.x + r.w).toBeLessThanOrEqual(layout.x + layout.w);
      expect(r.y + r.h).toBeLessThanOrEqual(layout.y + layout.h);
    }
    const corners = new Set(rects.map((r) => `${r.x},${r.y}`));
    expect(corners.size).toBe(rects.length);
  });

  it("fills in a big room a screen at a time", () => {
    const game = createGame(1);
    expect(roomSeen(game, FERNWHISTLE)).toBe(false);
    game.flags.add(flags.seen("overworld:3,1"));
    expect(roomSeen(game, FERNWHISTLE)).toBe(true);
    expect(cellSeen(game, "overworld:3,1")).toBe(true);
    expect(cellSeen(game, "overworld:4,2")).toBe(false);
  });

  it("gives Fernwhistle its two-by-three block of the overworld map", () => {
    const layout = mapLayout("overworld");
    const room = roomRect(layout, FERNWHISTLE);
    const eastfield = roomRect(layout, "overworld:2,1");
    expect(room.w).toBe(eastfield.w * 2);
    expect(room.h).toBe(eastfield.h * 3);
    expect(room.x).toBe(eastfield.x + eastfield.w);
    expect(cellRect(layout, "overworld:3,1")).toEqual({ ...eastfield, x: room.x });
  });

  it("keeps the page arrows clear of the map itself", () => {
    for (const arrow of [MAP_ARROWS.prev, MAP_ARROWS.next]) {
      expect(arrow.y + arrow.h).toBeLessThanOrEqual(MAP_BOX.y);
    }
  });
});
