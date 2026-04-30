from shutil import which


TOOLS = {
    "node": "Node.js",
    "npm": "npm",
    "python": "Python",
    "psql": "PostgreSQL CLI",
}


def main():
    for command, label in TOOLS.items():
        status = "ok" if which(command) else "pendiente"
        print(f"{label}: {status}")


if __name__ == "__main__":
    main()
