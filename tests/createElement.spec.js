import { describe, it, expect } from "vitest";
import React from "../core/React.js";

describe("createElement", () => {
  it("should return a vdom for element", () => {
    const element = React.createElement("div", { id: "app" }, "hello", "world");
    expect(element).toEqual({
      type: "div",
      props: {
        id: "app",
        children: [
          {
            type: "TEXT_ELEMENT",
            props: {
              nodeValue: "hello",
              children: [],
            },
          },
          {
            type: "TEXT_ELEMENT",
            props: {
              nodeValue: "world",
              children: [],
            },
          },
        ],
      },
    });
  });
});
