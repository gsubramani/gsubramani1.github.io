import sympy as sym
import numpy as np
from scipy.optimize import minimize
from sympy.utilities.autowrap import autowrap

""" This file contains the symbolic development of the generalized constraint model.
The constraint model equations are symbolically derived using sympy and compiled into 
c/fortran code through autowrap for fast execution. Functionality to assemble and fit 
these equations using least squares regression are also provided."""

# preliminaries
def tilde(a):
    ax = a[0]
    ay = a[1]
    az = a[2]
    return sym.Matrix([[0,-az,ay],[az,0,-ax],[-ay,ax,0]])

def qtoA(q):
    e0 = q[0]
    e = sym.Matrix(q[1:4])

    A = (sym.Matrix([e0])**2 - e.T*e)[0]*sym.eye(3) + 2*e*e.T + 2*e0*tilde(e)
    return A

def getE(q):
    e0 = q[0]
    e = sym.Matrix(q[1:4])
    return (-e).row_join(tilde(e)+e0*sym.eye(3))

def getG(q):
    e0 = q[0]
    e = sym.Matrix(q[1:4])
    return (-e).row_join(-tilde(e)+e0*sym.eye(3))

def exp_map(w):
    w = sym.Matrix(w)
    # theta = ( w[0]**2 + w[1]**2 + w[2]**2 )**0.5 + 1e-30
    theta = ( w[0]**2 + w[1]**2 + w[2]**2 )**0.5
    w = w/theta
    w_hat = sym.Matrix([[0,-w[2],w[1]],[w[2],0,-w[0]],[-w[1],w[0],0]])
    return sym.eye(3,3) + w_hat*sym.sin(theta) + w_hat**2*(1 - sym.cos(theta))


class constraint():
    """ This is the main base class that describes the generalized model of a constraint. Different constraint model
    child classes provide Phi_mat and non_kin symbolic equations."""
    rx,ry,rz = sym.symbols("rx ry rz")
    e0,e1,e2,e3 = sym.symbols("e0 e1 e2 e3")

    frx,fry,frz = sym.symbols("frx fry frz")
    taurx,taury,taurz = sym.symbols("taurx taury taurz")

    vx,vy,vz = sym.symbols("vx vy vz")
    wx,wy,wz = sym.symbols("wx wy wz")

    q = sym.Matrix([e0,e1,e2,e3])
    r = sym.Matrix([rx,ry,rz])

    fr = sym.Matrix([frx,fry,frz])
    taur = sym.Matrix([taurx,taury,taurz])

    v = sym.Matrix([vx,vy,vz])
    w = sym.Matrix([wx,wy,wz])

    knowns = (rx,ry,rz,e0,e1,e2,e3,frx,fry,frz,taurx,taury,taurz)

    Phi_mat = None
    non_kin = sym.Matrix([0])
    taueq1 = None
    feq1 = None

    force = None
    moment = None
    work_energy = None
    model_parameters = None
    Kinematics = None
    Statics = None


    def build_eqns(self):
        """This method builds the necessary equations"""
        Phi_mat_r = self.Phi_mat.jacobian(self.r)
        Phi_mat_q = self.Phi_mat.jacobian(self.q)
        self.num_c = len(self.Phi_mat)
        self.k = sym.MatrixSymbol('k', self.num_c,1)
        k_proxy = sym.Matrix(self.k).expand()
        # self.feq1 = Phi_mat_r.T * self.k + self.fr
        self.feq1 = Phi_mat_r.T * k_proxy + self.fr
        self.taueq1 = 1.0/2.0*getG(self.q)*Phi_mat_q.T * k_proxy + self.taur
        # position only equations
        self.phir = Phi_mat_r*self.v
        self.phiw = (1/2.0)*Phi_mat_q*(getG(self.q).T)*self.w
        self.phidelta = self.phir + self.phiw
        self.generate_jacobians()
        self.constraint_lambdification()

    def generate_jacobians(self):
        """Jacobians useful for optimization are computed"""
        # Jacobians - assuming squares are performed for least squares
        self.feq1J = (sym.Matrix(self.feq1).T * sym.Matrix(self.feq1)).jacobian(self.model_parameters)
        self.taueq1J = (sym.Matrix(self.taueq1).T*sym.Matrix(self.taueq1)).jacobian(self.model_parameters)
        self.Phi_matJ = (self.Phi_mat.T*self.Phi_mat).jacobian(self.model_parameters)
        self.non_kinJ = (self.non_kin.T*self.non_kin).jacobian(self.model_parameters)

        self.feq1Jk = (sym.Matrix(self.feq1.T*self.feq1)).jacobian(self.k)
        self.taueq1Jk = (sym.Matrix(self.taueq1.T*self.taueq1)).jacobian(self.k)


    def constraint_lambdification(self):
        """Each equation is converted to c/fortran code and compiled using sympy autowrap"""
        variables =  tuple(list(self.knowns)+[self.k]+list(self.model_parameters))
        self.Kinematics = autowrap(self.Phi_mat,args = variables)
        self.StaticsF = autowrap(self.feq1,args = variables)
        self.StaticsTau = autowrap(self.taueq1,args = variables)
        self.NonKin = autowrap(self.non_kin,args = variables)

        self.KeJ = autowrap(self.Phi_matJ,args = variables)
        self.NonKeJ = autowrap(self.non_kinJ,args = variables)

        self.StaticsFJ = autowrap(self.feq1J,args = variables)
        self.StaticsTauJ = autowrap(self.taueq1J,args = variables)
        self.StaticsFJk = autowrap(self.feq1Jk,args = variables)
        self.StaticsTauJk = autowrap(self.taueq1Jk,args = variables)


    def residual_eqn(self,knowns,k,unknowns):
        """Used to compute the force torque errors"""
        variables = tuple(list(knowns) + [np.transpose([k])] + list(unknowns))
        residual = np.append(self.Kinematics(*variables),self.NonKin(*variables))
        statics = np.append(self.StaticsF(*variables),self.StaticsTau(*variables))
        residual = np.append(residual,statics)

        return residual


    def objective(self,r,q,fr,taur,X):
        """Constructing LSQ regression objective for scipy optimize."""
        num_points = np.shape(r)[0]
        full_objective = np.array([])
        ks = X[:num_points*self.num_c]
        ks = np.reshape(ks,(num_points,self.num_c))
        unknowns = X[num_points*self.num_c:]
        for r_ind,q_ind,fr_ind,taur_ind,k in zip(r,q,fr,taur,ks):
            knowns = list(r_ind) + list(q_ind) + list(fr_ind) + list(taur_ind)
            full_objective = np.append(full_objective,self.residual_eqn(knowns,k,unknowns))
        return np.sum(full_objective**2)


    def objectiveJac(self,r,q,fr,taur,X):
        """Constructing the Jacobian of the LSQ regression for scipy optimize"""
        num_points = np.shape(r)[0]
        full_objective = np.array([])
        ks = X[:num_points * self.num_c]
        ks = np.reshape(ks, (num_points, self.num_c))
        unknowns = X[num_points * self.num_c:]

        objective_jac_variables = np.zeros(len(self.model_parameters))
        objective_jac_k = np.zeros(num_points * self.num_c)

        for ii,(r_ind,q_ind,fr_ind,taur_ind,k) in enumerate(zip(r,q,fr,taur,ks)):
            knowns = list(r_ind) + list(q_ind) + list(fr_ind) + list(taur_ind)
            # full_objective = np.append(full_objective,self.residual_eqn(knowns,k,unknowns))
            variables = tuple(list(knowns) + [np.transpose([k])] + list(unknowns))
            objective_jac_variables += (self.KeJ(*variables) + \
                                        self.NonKeJ(*variables) + \
                                       self.StaticsFJ(*variables) + \
                                       self.StaticsTauJ(*variables))[0]

            objective_jac_k[ii*self.num_c:ii*self.num_c + self.num_c] = (self.StaticsFJk(*variables) + \
                                                                        self.StaticsTauJk(*variables))[0]
        return np.append(objective_jac_k,objective_jac_variables)


    def get_min_objective(self,r,q,fr,taur):
        init_cond = np.random.rand(self.num_c * len(r) + len(self.model_parameters))
        objective_func = lambda X: self.objective(r, q, fr, taur, X)
        return objective_func


    def get_force_torque_residuals(self,r,q,fr,taur,params):
        """Computing lagrange multipliers for estimating reaction forces and moments through least squares for
        each sample"""
        def get_residual(r,q,fr,taur,k,params):
            knowns = list(r) + list(q) + list(fr) + list(taur)
            variables = tuple(knowns + [k] + list(params))
            residual = np.append(self.StaticsF(*variables), self.StaticsTau(*variables))
            return np.sum(residual**2)

        init_cond = np.random.rand(self.num_c)
        objective_func = lambda K: get_residual(r, q, fr, taur,K,params)
        return minimize(objective_func, init_cond, method='BFGS')

    def get_force_torque_residuals_many(self,r_array,q_array,fr_array,taur_array,params):
        """Performing the lagrange mulitipler estimation for a bunch of samples together"""
        optim_sols = []
        for r,q,fr,taur in zip(r_array,q_array,fr_array,taur_array):
            sol = self.get_force_torque_residuals(r,q,fr,taur,params)
            optim_sols.append(sol)

        return np.sum([sol.fun for sol in optim_sols]),optim_sols


    def min_objective(self,r,q,fr,taur,init_cond = None,numerical = False,maxiter = None):
        """Computing the least squares regression using BFGS"""
        if init_cond == None:
            init_cond = np.random.rand(self.num_c*len(r) + len(self.model_parameters))
        objective_func = lambda X:self.objective(r,q,fr,taur,X)
        objective_jac = lambda X:self.objectiveJac(r,q,fr,taur,X)
        # start_time = time()
        # print "start jac"
        options = {'disp': False, 'gtol': 1e-05, 'eps': 1.4901161193847656e-08, 'return_all': False,
                   'maxiter': maxiter, 'norm': np.inf}
        if numerical == False:
            self.min_solution = minimize(objective_func,init_cond,method='BFGS',jac=objective_jac,options = options)
        else:
            self.min_solution = minimize(objective_func,init_cond,method='BFGS',options=options)


    def parse_result(self):
        X = self.min_solution.x
        # ks = X[:num_points*self.num_c]
        # ks = np.reshape(ks,(num_points,self.num_c))
        unknowns = X[-len(self.model_parameters):]
        return unknowns

    def get_reaction(self,v_array,w_array,f_array_global,tau_array_global):
        return f_array_global,tau_array_global


class point_contact_constraint(constraint):
    """Example constraint model"""
    # (a,b,c) is the point
    # (sx,sy,sz) is the contact location on rigid body

    a,b,c,sx,sy,sz = sym.symbols("a b c sx sy sz")
    model_parameters = (a,b,c,sx,sy,sz)

    def __init__(self):
        s = sym.Matrix([self.sx,self.sy,self.sz])
        Phi1 = sym.Matrix([self.a, self.b, self.c]) - (self.r + qtoA(self.q) * s)
        self.Phi_mat = Phi1
        self.build_eqns()


if __name__ == "__main__":
    pc = point_contact_constraint()
    r_test = np.array([[1.0, 0, 0], [0, 1, 0]])
    q_test = np.array([[1, 0, 0, 0], [0,1.0/2**0.5, 1.0/2**0.5,0]])
    fr_test = np.array([[0., 1, 0], [1, 0, 0]])
    taur_test = np.array([[0., 0, -1], [0, 0, -1]])
    v_test = np.array([[0, 1., 0], [-1, 0, 0.0]])
    w_test = np.array([[0., 0, 1], [0, 0, -1]])


    pc.min_objective(r_test, q_test, fr_test, taur_test)
    print pc.min_solution.fun
    print pc.parse_result()

    print pc.get_force_torque_residuals_many(r_test, q_test, fr_test, taur_test, pc.parse_result())


