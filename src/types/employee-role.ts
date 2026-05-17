/** Registro en tabla `tecnicos` — vincula un empleado para inspecciones y servicios. */
export type TechnicianResponse = {
  id: number;
  employeeId: number;
  createdAt: string;
};

export type TechnicianRequest = {
  employeeId: number;
};

/** Registro en tabla `distribuidores` (persona) — distinto del rol sucursal distribuidor. */
export type DistributorPersonResponse = {
  id: number;
  employeeId: number;
  createdAt: string;
};

export type DistributorPersonRequest = {
  employeeId: number;
};
