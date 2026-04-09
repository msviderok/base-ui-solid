export interface PropDef {
  type?: string;
  detailedType?: string;
  default?: string;
  required?: boolean;
  description?: string;
  example?: string;
}

export interface FunctionParamDef extends PropDef {
  optional?: boolean;
}

export interface AttributeDef {
  type?: string;
  description?: string;
}

export interface CssVariableDef {
  type?: string;
  description?: string;
}
