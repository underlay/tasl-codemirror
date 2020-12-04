import { EditorState, Extension } from "@codemirror/next/state";
import { Diagnostic } from "@codemirror/next/lint";
import { EditorView } from "@codemirror/next/view";
import { APG } from "@underlay/apg";
export interface UpdateProps {
    errors: number;
    state: EditorState;
    schema: APG.Schema;
    namespaces: Record<string, string>;
}
export declare function lintView({ state, }: EditorView): UpdateProps & {
    diagnostics: Diagnostic[];
};
export declare const makeSchemaLinter: (onChange: (props: UpdateProps) => void) => Extension;
