import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Home from "../../pages/Home";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const mockAuth = {
  user: null,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};

describe("Café Map Search Bar", () => {
  it("renders search input correctly", () => {
    render(
      <AuthContext.Provider value={mockAuth}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const searchInput = screen.getByPlaceholderText(/search by zipcode, borough or café name/i);
    expect(searchInput).toBeInTheDocument();
  });

  it("allows the user to type a query", async () => {
    render(
      <AuthContext.Provider value={mockAuth}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const searchInput = screen.getByPlaceholderText(/search by zipcode, borough or café name/i);
    await userEvent.type(searchInput, "Brooklyn");
    expect(searchInput.value).toBe("Brooklyn");
  });

  it("submits search and enables clear button to reset search", async () => {
    render(
      <AuthContext.Provider value={mockAuth}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const searchInput = screen.getByPlaceholderText(/search by zipcode, borough or café name/i);
    const submitBtn = screen.getByRole("button", { name: /find cafés/i });

    await userEvent.type(searchInput, "Manhattan");
    fireEvent.click(submitBtn);

    const clearBtn = screen.getByLabelText(/clear search/i);
    expect(clearBtn).toBeInTheDocument();

    await userEvent.click(clearBtn);
    expect(searchInput.value).toBe("");
  });
});