/// <reference types="react" />
import { UpdateProps } from "./lint.js";
export interface EditorProps {
    initialValue: string;
    onChange?: (props: UpdateProps) => void;
}
export declare function Editor({ initialValue, onChange }: EditorProps): JSX.Element;
