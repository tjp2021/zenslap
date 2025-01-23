declare module 'textarea-caret' {
    interface CaretCoordinates {
        top: number;
        left: number;
        height: number;
    }

    function getCaretCoordinates(element: HTMLElement, position: number): CaretCoordinates;
    
    export = getCaretCoordinates;
} 