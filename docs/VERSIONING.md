# Versioning Guidelines

HyperLink uses a standardized three-point numbering version system formatted as:

**`x.xx.xxx`**

## Structure

*   **`x` (First number): Major release**
    *   This is reserved for significant milestones—something to be proud of.
    *   Examples: `1.00.000`, `2.00.000`
*   **`xx` (Second number): Minor release**
    *   Used for small feature updates, general improvements, "and stuff". 
    *   Padded to two digits.
    *   Example: `1.05.000` (5th minor release after 1.0)
*   **`xxx` (Third number): The update of shame**
    *   Reserved for bug fixes, hotfixes, and tiny patches.
    *   Padded to three digits.
    *   Example: `1.05.012` (12th patch after 1.05)

## Examples

*   `1.00.000`: Initial major release.
*   `1.01.000`: Added a new small feature.
*   `1.01.001`: Fixed a typo in the UI (update of shame).
*   `2.00.000`: Massive architectural overhaul and redesign.

*Note: For npm compatibility in certain strict scenarios, tools may strip leading zeros during publishing, but all internal documentation and tags will follow this `x.xx.xxx` convention.*
