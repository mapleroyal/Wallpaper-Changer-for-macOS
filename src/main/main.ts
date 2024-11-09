import { app, BrowserWindow, ipcMain, session } from "electron";
import { join } from "path";
import { exec } from "child_process";
import { promises as fs } from "fs";
import { homedir } from "os";

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
const WALLPAPER_DIR = join(homedir(), "Pictures", "wallpapers");
const UNMODIFIED_WALLPAPER = join(WALLPAPER_DIR, "current_wallpaper_unmodified.jpg");
const MODIFIED_WALLPAPER = join(WALLPAPER_DIR, "current_wallpaper_modified.jpg");
const BLACK_WALLPAPER = "/tmp/black_wallpaper.png";

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
const setWallpaper = async (wallpaperPath: string) => {
  const plistPath = join(
    process.env.HOME || "",
    "Library/Application Support/com.apple.wallpaper/Store/Index.plist"
  );
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
    const rendererPort = process.argv[2];
    mainWindow.loadURL(`http://localhost:${rendererPort}`);
  } else {
    mainWindow.loadFile(join(app.getAppPath(), "renderer", "index.html"));
  }
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
        const { scale = 6, colors = 24 } = args;
        await executeCommand(
          `magick "${UNMODIFIED_WALLPAPER}" -scale ${scale}% -colors ${colors} -scale 1667% "${MODIFIED_WALLPAPER}"`
        );
        await setWallpaper(MODIFIED_WALLPAPER);
        console.log("Wallpaper pixelated successfully.");
        break;
      }

      // Apply blur effect to current wallpaper
      case "blur_wallpaper": {
        const { radius = 65 } = args;
        await executeCommand(`magick "${UNMODIFIED_WALLPAPER}" -blur 0x${radius} "${MODIFIED_WALLPAPER}"`);
        await setWallpaper(MODIFIED_WALLPAPER);
        console.log("Wallpaper blurred successfully.");
        break;
      }

      // Darken current wallpaper
      case "darken_wallpaper": {
        const { amount = 30 } = args;
        const wallpaperToDarken = (await fs.stat(MODIFIED_WALLPAPER).catch(() => false))
          ? MODIFIED_WALLPAPER
          : UNMODIFIED_WALLPAPER;
        await executeCommand(
          `magick "${wallpaperToDarken}" -modulate ${amount},100,100 "${MODIFIED_WALLPAPER}"`
        );
        await setWallpaper(MODIFIED_WALLPAPER);
        console.log("Wallpaper darkened successfully.");
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
        await executeCommand(`magick -size 1x1 xc:black "${BLACK_WALLPAPER}"`);
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
