import fireEvent from '@rbxts/react-roblox-fire';
export function createMockInputObject(properties: Partial<InputObject>): InputObject {
  return {
    Delta: Vector3.zero,
    Position: Vector3.zero,
    KeyCode: Enum.KeyCode.Unknown,
    UserInputState: Enum.UserInputState.End,
    UserInputType: Enum.UserInputType.MouseButton1,
    ...properties,
  } satisfies Partial<InputObject> as never;
}

export function fireClickEvent<T extends GuiButton>(instance: T, inputObject: InputObject = createMockInputObject({}), clickCount = 1) {
  fireEvent(instance as GuiButton, 'Activated', inputObject, clickCount);
}
