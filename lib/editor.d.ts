/// <reference types="react" />
import { UpdateProps } from "./lint.js";
export interface EditorProps {
    initialValue: string;
    onChange?: (props: UpdateProps) => void;
    readOnly?: boolean;
    noLint?: boolean;
}
export declare function Editor({ initialValue, onChange, readOnly, noLint, }: EditorProps): JSX.Element;
