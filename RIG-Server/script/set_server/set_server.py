import subprocess


if __name__ == "__main__":
    print("Installing the necessary dependencies:\n")

    cammand = "npm install \n npm run dep-install"
    subprocess.run(cammand, shell=True)