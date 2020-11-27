import { EditorState } from "@codemirror/next/state";
import { Diagnostic } from "@codemirror/next/lint";
import { EditorView } from "@codemirror/next/view";
import { APG } from "@underlay/apg";
export declare const errorUnit: APG.Unit;
export interface UpdateProps {
    state: EditorState;
    schema: APG.Schema;
    namespaces: Record<string, string>;
}
export declare const schemaLinter: (onChange: (props: UpdateProps) => void) => (view: EditorView) => Diagnostic[];
