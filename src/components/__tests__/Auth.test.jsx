import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Auth from "../Auth";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

describe("Login and Sign Up Forms", () => {
  it("renders login form elements properly", () => {
    render(
      <AuthContext.Provider value={{ user: null, signIn: vi.fn(), signUp: vi.fn() }}>
        <MemoryRouter>
          <Auth mode="login" />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByPlaceholderText(/your email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/your password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("shows error when sign-up passwords do not match", async () => {
    const mockSignUp = vi.fn();
    render(
      <AuthContext.Provider value={{ user: null, signIn: vi.fn(), signUp: mockSignUp }}>
        <MemoryRouter>
          <Auth mode="signup" />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await userEvent.type(screen.getByPlaceholderText(/your email/i), "denisse@workandbrew.com");
    await userEvent.type(screen.getByPlaceholderText(/choose a username/i), "denisse");
    await userEvent.type(screen.getByPlaceholderText(/create a password/i), "secretpass1");
    await userEvent.type(screen.getByPlaceholderText(/confirm your password/i), "secretpass2");

    const submitBtn = screen.getByRole("button", { name: /join the list/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("submits login form with user credentials", async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    render(
      <AuthContext.Provider value={{ user: null, signIn: mockSignIn, signUp: vi.fn() }}>
        <MemoryRouter>
          <Auth mode="login" />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await userEvent.type(screen.getByPlaceholderText(/your email/i), "test@workandbrew.com");
    await userEvent.type(screen.getByPlaceholderText(/your password/i), "mypassword123");

    const submitBtn = screen.getByRole("button", { name: /log in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("test@workandbrew.com", "mypassword123");
    });
  });
});