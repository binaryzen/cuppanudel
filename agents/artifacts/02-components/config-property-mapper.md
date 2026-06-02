```yaml
id: config/property-mapper
lane: lane-a
purpose: >
  Provides the two shared serialization primitives — validateAndApply and serialize —
  used by every component that reads or writes workspace config. It enforces a two-pass
  collect-then-write algorithm so target state is never partially mutated on error.
scope:
  includes:
    - "validateAndApply(schema, source, target) — two-pass validate + atomic write"
    - "serialize(schema, source) — picks schema-named keys; fills defaults for absent fields"
    - "All field descriptor types: int, float, bool, string, int[], float[], bool[]"
    - "Validators: required, min, max, minLength, maxLength, exactLength"
    - "Range violations: clamped scalars produce a warning string; array length mismatches produce an error string"
    - "exactLength: named field looked up in source; if that field is missing or invalid, the length check is skipped silently"
    - "Array element-level errors reported as '<key>[<index>]: ...'"
    - "Module file at poc/config/property-mapper.js"
  excludes:
    - "YAML parsing or serialization — caller owns the jsyaml layer"
    - "Deep equality comparison (used by workspace import confirmation — not this module's job)"
    - "Cross-field validation beyond exactLength"
    - "Nested object schemas — all fields are top-level keys"
    - "Any DOM, Web Audio, or browser API"
interface: |
  // poc/config/property-mapper.js

  // Field descriptor shape (plain JS object — no class):
  interface FieldDescriptor {
    key: string
    type: 'int' | 'float' | 'bool' | 'string' | 'int[]' | 'float[]' | 'bool[]'
    required?: boolean        // default false; absence is an error if true
    min?: number              // inclusive lower bound for scalar or array elements
    max?: number              // inclusive upper bound
    minLength?: number        // minimum array length
    maxLength?: number        // maximum array length
    exactLength?: string      // name of a sibling field in source whose value is the required array length
    default?: unknown         // used by serialize() when field absent; NOT applied during import
  }

  // Two-pass validate + atomic write.
  // Pass 1: walk schema, collect { key, value } pairs and error strings.
  // Pass 2: if no error strings, write all collected pairs to target; else return errors without touching target.
  // Warnings (clamped values) are included in the return array but do NOT block the write.
  // Returns the combined error+warning string array. Empty array = clean success.
  function validateAndApply(
    schema: FieldDescriptor[],
    source: Record<string, unknown>,
    target: Record<string, unknown>
  ): string[]

  // Picks only keys named in schema from source. Applies descriptor.default for absent fields.
  // Returns a plain JS object; does NOT call jsyaml.dump().
  function serialize(
    schema: FieldDescriptor[],
    source: Record<string, unknown>
  ): Record<string, unknown>
success_criteria:
  - "Given schema=[{key:'bpm',type:'int',min:20,max:300}], source={bpm:120}, target={}, validateAndApply writes target.bpm=120 and returns []"
  - "Given schema=[{key:'bpm',type:'int',min:20,max:300}], source={bpm:350}, target={}, validateAndApply writes target.bpm=300 and returns ['bpm: 350 out of range 20–300, clamped to 300']"
  - "Given schema=[{key:'bpm',type:'int',required:true}], source={}, target={bpm:120}, validateAndApply leaves target.bpm=120 and returns ['bpm: required field missing']"
  - "Given schema=[{key:'bpm',type:'int'},{key:'offsets',type:'float[]',exactLength:'beatsPerMeasure'}], source={bpm:4,offsets:[0,0.5]}, validateAndApply returns error 'offsets: length 2 does not match beatsPerMeasure (4)' and does NOT write any field to target"
  - "Given schema=[{key:'vol',type:'float',min:0,max:1}], source={vol:'loud'}, target={}, validateAndApply returns [\"vol: expected float, got string\"] and target is not modified"
  - "Given schema with exactLength referencing a field absent in source, validateAndApply does not push a length error for the array field"
  - "Given schema=[{key:'x',type:'int'},{key:'y',type:'int'}], source={x:1,y:'bad'}, target={}, validateAndApply returns error for y only and does NOT write x to target (atomic: no partial write)"
  - "Given schema=[{key:'arr',type:'float[]'}], source={arr:[0.5,1.5]}, min=0,max=1, validateAndApply clamps arr[1] to 1.0, writes target.arr=[0.5,1.0], returns ['arr[1]: 1.5 out of range 0–1, clamped to 1']"
  - "serialize({key:'bpm',default:120}, {}) returns {bpm:120}"
  - "serialize({key:'bpm',default:120}, {bpm:90}) returns {bpm:90}"
  - "serialize picks ONLY keys in schema — extra keys in source are omitted from result"
failure_criteria:
  - "If source[key] is the wrong JS type (e.g., string where int expected), validateAndApply returns error '<key>: expected <type>, got <actualType>' and does not write the field"
  - "If any hard error is present (type mismatch, length mismatch, required missing), validateAndApply returns the full error array without modifying target at all"
  - "If exactLength names a field whose source value is not a valid int, the length check is silently skipped — no error is generated for the array field on account of the missing reference"
  - "Array element error format must be '<key>[<index>]: ...' — violations of this format constitute a failure"
dependencies:
  requires: []
  must_not_require:
    - "any timing module"
    - "any audio module"
    - "any DOM or browser API"
    - "config/sample-provider-registry"
    - "config/workspace"
```
