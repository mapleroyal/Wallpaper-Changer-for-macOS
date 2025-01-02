process.env.NODE_ENV = process.env.NODE_ENV || "production"; // Ensure it's always defined
import { app, BrowserWindow, ipcMain, session } from "electron";
import { join } from "path";
import { exec } from "child_process";
import { promises as fs } from "fs";

// ==============================
// Types and Interfaces
// ==============================
interface CommandPayload {
  command: string;
  args?: Record<string, any>;
}

// ==============================
// Constants
// ==============================
// Directory and file paths for wallpaper management
const WALLPAPER_DIR = "/Users/user1/Pictures/wallpapers";
const UNMODIFIED_WALLPAPER = "/Users/user1/Pictures/wallpapers/current_wallpaper_unmodified.jpg";
const MODIFIED_WALLPAPER = "/Users/user1/Pictures/wallpapers/current_wallpaper_modified.jpg";
const BLACK_WALLPAPER = "/tmp/black_wallpaper.png";
const MAGICK_PATH = join(app.getAppPath(), "static/bin/magick");

// ==============================
// Utility Functions
// ==============================
/**
 * Executes a shell command and returns a promise
 * @param command - The shell command to execute
 * @returns Promise that resolves when the command completes
 */
const executeCommand = (command: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing "${command}":`, stderr);
        reject(error);
      } else {
        console.log(stdout);
        resolve();
      }
    });
  });
};

/**
 * Sets the macOS wallpaper using PlistBuddy
 * @param wallpaperPath - Path to the wallpaper image file
 */
console.log(`process.env.HOME: ${process.env.HOME}`);
const setWallpaper = async (wallpaperPath: string) => {
  const plistPath = "/Users/user1/Library/Application Support/com.apple.wallpaper/Store/Index.plist";
  console.log(`plistPath: ${plistPath}`);
  const command = `/usr/libexec/PlistBuddy -c "set AllSpacesAndDisplays:Desktop:Content:Choices:0:Files:0:relative file:///${wallpaperPath}" "${plistPath}" && killall WallpaperAgent`;
  await executeCommand(command);
};

// ==============================
// Electron Window Management
// ==============================
/**
 * Creates the main application window with appropriate settings
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 406,
    height: 975,
    vibrancy: "fullscreen-ui", // use "under-window" for a more subtle effect
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load appropriate URL based on environment
  if (process.env.NODE_ENV === "development") {
    console.log(`process.env.NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`process.argv: ${process.argv}`);
    const rendererPort = process.argv[2];
    mainWindow.loadURL(`http://localhost:${rendererPort}`);
  } else {
    console.log(`process.env.NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`process.argv: ${process.argv}`);
    console.log(`__dirname: ${__dirname}`);
    mainWindow.loadFile(join(__dirname, "../renderer", "index.html"));
  }

  // mainWindow.webContents.openDevTools(); // Uncomment to open DevTools by default
}

// ==============================
// Application Lifecycle
// ==============================
app.whenReady().then(() => {
  createWindow();

  // Set up security headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": ["script-src 'self'"],
      },
    });
  });

  // Handle macOS app activation
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit the app when all windows are closed (except on macOS)
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// ==============================
// IPC Command Handlers
// ==============================
ipcMain.on("command", async (event, payload: CommandPayload) => {
  console.log(`TESTING WHETHER THIS FUNCTION IS CALLED`);
  console.log(`Received command: ${payload.command}`);
  const { command, args = {} } = payload;

  try {
    switch (command) {
      // Apply a new random wallpaper from the specified category
      case "apply_new_wallpaper": {
        const categories = await fs.readdir(WALLPAPER_DIR, { withFileTypes: true });
        const dirs = categories.filter((dir) => dir.isDirectory()).map((dir) => dir.name);

        if (dirs.length === 0) throw new Error("No categories found.");

        // Filter directories based on the specified type
        const validDirs = args.type
          ? dirs.filter((dir) => dir.toLowerCase().includes(args.type.toLowerCase()))
          : dirs;

        if (validDirs.length === 0) throw new Error(`No categories found for type: ${args.type}`);

        // Select and apply random wallpaper
        const selectedCategory = validDirs[Math.floor(Math.random() * validDirs.length)];
        const categoryPath = join(WALLPAPER_DIR, selectedCategory);
        const files = (await fs.readdir(categoryPath)).filter((file) =>
          [".jpg", ".png"].includes(join(file).slice(-4).toLowerCase())
        );

        if (files.length === 0) throw new Error("No wallpapers found in the selected category.");

        const randomFile = files[Math.floor(Math.random() * files.length)];
        await fs.copyFile(join(categoryPath, randomFile), UNMODIFIED_WALLPAPER);
        await setWallpaper(UNMODIFIED_WALLPAPER);
        if (await fs.stat(MODIFIED_WALLPAPER).catch(() => false)) {
          await fs.unlink(MODIFIED_WALLPAPER);
        }
        console.log("New wallpaper applied successfully.");
        break;
      }

      // Apply pixelation effect to current wallpaper
      case "pixelate_wallpaper": {
        const { scale, colors } = args;
        await executeCommand(
          `${MAGICK_PATH} "${UNMODIFIED_WALLPAPER}" -scale ${scale}% -colors ${colors} -scale 1667% "${MODIFIED_WALLPAPER}"`
        );
        await setWallpaper(MODIFIED_WALLPAPER);
        console.log("Wallpaper pixelated successfully.");
        break;
      }

      // Apply blur effect to current wallpaper
      case "blur_wallpaper": {
        const { radius } = args;
        await executeCommand(
          `${MAGICK_PATH} "${UNMODIFIED_WALLPAPER}" -blur 0x${radius} "${MODIFIED_WALLPAPER}"`
        );
        await setWallpaper(MODIFIED_WALLPAPER);
        console.log("Wallpaper blurred successfully.");
        break;
      }

      // Apply darken effect to current wallpaper
      case "darken_wallpaper": {
        const { amount } = args;
        const transparency = Math.max(0, Math.min(1, amount / 100)); // Ensure the transparency value is between 0 and 1
        const wallpaperToDarken = (await fs.stat(MODIFIED_WALLPAPER).catch(() => false))
          ? MODIFIED_WALLPAPER
          : UNMODIFIED_WALLPAPER;

        const dimensionsCommand = `${MAGICK_PATH} identify -format "%wx%h" "${wallpaperToDarken}"`;
        const dimensions = await new Promise<string>((resolve, reject) => {
          exec(dimensionsCommand, (error, stdout) => {
            if (error) {
              reject(new Error(`Failed to get image dimensions: ${error.message}`));
            } else {
              resolve(stdout.trim());
            }
          });
        });

        const overlayCommand = `${MAGICK_PATH} "${wallpaperToDarken}" \\( -size ${dimensions} xc:"rgba(0,0,0,${transparency})" \\) -compose over -composite "${MODIFIED_WALLPAPER}"`;
        await executeCommand(overlayCommand);

        await setWallpaper(MODIFIED_WALLPAPER);
        console.log("Wallpaper darkened successfully using new method.");
        break;
      }

      // Revert to unmodified wallpaper
      case "revert_wallpaper":
        if (await fs.stat(MODIFIED_WALLPAPER).catch(() => false)) {
          await fs.unlink(MODIFIED_WALLPAPER);
        }
        if (await fs.stat(UNMODIFIED_WALLPAPER).catch(() => false)) {
          await setWallpaper(UNMODIFIED_WALLPAPER);
          console.log("Reverted to the unmodified wallpaper successfully.");
        } else {
          console.log("No unmodified wallpaper found to revert to.");
        }
        break;

      // Set solid black wallpaper
      case "set_black_wallpaper":
        await executeCommand(`${MAGICK_PATH} -size 1x1 xc:black "${BLACK_WALLPAPER}"`);
        await setWallpaper(BLACK_WALLPAPER);
        console.log("Black wallpaper set successfully.");
        break;

      default:
        console.log(`Unknown command: ${command}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error handling command "${command}":`, error.message);
    } else {
      console.error(`Error handling command "${command}":`, error);
    }
  }
});
