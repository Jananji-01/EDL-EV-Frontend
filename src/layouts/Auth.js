import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import ceblogo from "assets/img/ceb-logo-and-wave.png";

// components

import Navbar from "components/Navbars/AuthNavbar.js";
import FooterSmall from "components/Footers/FooterSmall.js";

// views

import Login from "views/auth/Login.js";
import Otp from "views/auth/Otp.js";
import Register from "views/auth/Register.js";
import ResetPassword from "views/auth/ResetPassword";
import FogotPassword from "views/auth/FogotPassword";

export default function Auth() {
  return (
    <>
      {/* <Navbar transparent /> */}
      <main>
        <section
          className="relative w-full h-full min-h-screen"
          style={{ height: "100vh" }}
        >
          <div
            className="absolute top-0 w-full h-full bg-white bg-no-repeat bg-full"
            style={{
              backgroundImage: `url(${ceblogo})`,
              backgroundPosition: "bottom",
              opacity: 0.6,
              zIndex: -1,
            }}
          ></div>
          <Switch>
            <Route path="/auth/login" exact component={Login} />
            <Route path="/auth/otp" exact component={Otp} />
            <Route path="/auth/register" exact component={Register} />
            <Route path="/auth/reset" exact component={ResetPassword} />
            <Route path="/auth/forgot" exact component={FogotPassword} />
            <Redirect from="/auth" to="/auth/login" />
          </Switch>
          {/* <FooterSmall absolute /> */}
        </section>
      </main>
    </>
  );
}




