
export interface ValidationMarker {
    /**
     * Short label describing this marker message, e.g., short validation message
     */
    readonly label: string
    /**
     * Full description of this marker, e.g., full validation message
     */
    readonly description: string
    /**
     * Id of the model element this marker refers to
     */
    readonly elementId: string
    /**
     * Marker kind, e.g., info, warning, error or custom kind
     */
    readonly kind: string
}
