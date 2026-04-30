export class LoginUseCase {
  constructor({ userRepository, passwordVerifier, sessionTokenIssuer }) {
    this.userRepository = userRepository;
    this.passwordVerifier = passwordVerifier;
    this.sessionTokenIssuer = sessionTokenIssuer;
  }

  async execute(command) {
    const username = command?.username?.trim();
    const password = command?.password;

    if (!username || !password) {
      return rejected("Usuario y contrasena son obligatorios.");
    }

    const user = await this.userRepository.findByUsername(username);

    if (!user || !user.isActive) {
      return rejected("Credenciales invalidas.");
    }

    const validPassword = await this.passwordVerifier.verify(password, user.passwordHash);

    if (!validPassword) {
      return rejected("Credenciales invalidas.");
    }

    const token = await this.sessionTokenIssuer.issue(user);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role
      },
      error: null
    };
  }
}

function rejected(error) {
  return {
    success: false,
    token: null,
    user: null,
    error
  };
}
