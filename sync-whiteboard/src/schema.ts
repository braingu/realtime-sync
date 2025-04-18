import {
  createTLSchema,
  defaultBindingSchemas,
  defaultShapeSchemas,
} from "@tldraw/tlschema";

export const whiteboardSchema = createTLSchema({
  shapes: {
    ...defaultShapeSchemas,
    //TODO: add custom shapes here
  },
  bindings: defaultBindingSchemas,
});
