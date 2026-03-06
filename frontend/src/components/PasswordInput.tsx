import React, { useState } from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const PasswordInput: React.FC<Props> = ({ label, ...rest }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="field">
      <label className="label">{label}</label>
      <div className="password-wrapper">
        <input
          type={show ? "text" : "password"}
          className="input"
          {...rest}
        />
        <button
          type="button"
          className="toggle-btn"
          onClick={() => setShow((s) => !s)}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
};

