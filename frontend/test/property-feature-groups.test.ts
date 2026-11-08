import { describe, expect, it } from "vitest";
import {
  balanceColumns,
  groupFeatures,
} from "../src/features/properties/property-feature-groups";

describe("property feature groups", () => {
  it("sorts verified features into logical groups and drops empty ones", () => {
    const groups = groupFeatures([
      "Automated gate",
      "CCTV setup",
      "Kitchen with island",
      "Master bedroom with walk-in closet and private lanai",
      "Maid's room with its own toilet and bath",
      "Sofa set and dining set",
      "King-size bed and twin beds",
    ]);
    expect(groups).toEqual([
      { title: "Smart home and security", items: ["Automated gate", "CCTV setup"] },
      { title: "Living spaces and amenities", items: ["Kitchen with island"] },
      {
        title: "Bedrooms and service areas",
        items: [
          "Master bedroom with walk-in closet and private lanai",
          "Maid's room with its own toilet and bath",
        ],
      },
      {
        title: "Furniture and inclusions",
        items: ["Sofa set and dining set", "King-size bed and twin beds"],
      },
    ]);
    expect(groupFeatures(["2-car garage"])).toEqual([
      { title: "Living spaces and amenities", items: ["2-car garage"] },
    ]);
    expect(groupFeatures([])).toEqual([]);
  });

  it("balances groups over two columns instead of filling one", () => {
    const [left, right] = balanceColumns([
      { title: "A", items: ["1", "2", "3", "4", "5", "6"] },
      { title: "B", items: ["1", "2"] },
      { title: "C", items: ["1", "2", "3"] },
      { title: "D", items: ["1"] },
    ]);
    expect(left.map((group) => group.title)).toEqual(["A", "D"]);
    expect(right.map((group) => group.title)).toEqual(["B", "C"]);
    expect(balanceColumns([])).toEqual([[], []]);
  });
});
