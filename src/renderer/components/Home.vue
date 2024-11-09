<script setup lang="ts">
/**
 * Wallpaper Controller Component
 *
 * A Vue component that provides a user interface for controlling wallpaper settings
 * and applying various visual effects. Supports random wallpaper selection,
 * pixelation, blur, and darkening effects.
 */

import { ref } from "vue";

/**
 * Interface defining the structure of wallpaper modification settings
 * Each effect has its own configuration parameters
 */
interface WallpaperSettings {
  pixelate: {
    scale: number; // Controls the size of pixels (1-20)
    colors: number; // Number of colors in the palette (2-256)
  };
  blur: {
    radius: number; // Blur intensity (0-100)
  };
  darken: {
    amount: number; // Darkening percentage (0-100)
  };
}

// Default settings to use for reset functionality
const DEFAULT_SETTINGS: WallpaperSettings = {
  pixelate: {
    scale: 6,
    colors: 24,
  },
  blur: {
    radius: 65,
  },
  darken: {
    amount: 50,
  },
};

// Initialize settings with default values
const settings = ref<WallpaperSettings>(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));

// Tracks the selected wallpaper type (light/dark/null for either)
const selectedWallpaperType = ref<string | null>(null);

/**
 * Sends a command to the Electron backend
 * @param command - The command identifier
 * @param args - Optional arguments for the command
 */
const sendCommand = (command: string, args?: Record<string, any>) => {
  const serializedArgs = args ? JSON.parse(JSON.stringify(args)) : undefined;
  console.log("Sending command:", command, serializedArgs); // Debug log
  window.electronAPI.sendCommand({ command, args: serializedArgs });
};

/**
 * Applies a new random wallpaper based on the selected type preference
 */
const applyWallpaper = () => {
  if (selectedWallpaperType.value) {
    sendCommand("apply_new_wallpaper", { type: selectedWallpaperType.value });
  } else {
    sendCommand("apply_new_wallpaper");
  }
};

/**
 * Resets the settings for a specific effect to their default values
 * @param effect - The effect to reset ('pixelate' | 'blur' | 'darken')
 */
const resetEffect = (effect: keyof WallpaperSettings) => {
  settings.value[effect] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[effect]));
};
</script>

<template>
  <div class="container">
    <!-- Random Wallpaper Selection -->
    <section class="control-section">
      <h2>Random Wallpaper</h2>
      <div class="button-group">
        <!-- Wallpaper type selection radio buttons -->
        <div class="radio-group">
          <label>🤷‍♂️ <input type="radio" v-model="selectedWallpaperType" value="" />Either </label>
          <label>🔆 <input type="radio" v-model="selectedWallpaperType" value="light" />Light </label>
          <label>🌙 <input type="radio" v-model="selectedWallpaperType" value="dark" />Dark </label>
        </div>
        <button @click="applyWallpaper">Apply</button>
      </div>
    </section>

    <!-- Wallpaper Effects Controls -->
    <section class="control-section">
      <h2>Effects</h2>

      <!-- Pixelation Effect Controls -->
      <div class="effect-control">
        <h3>Pixelate</h3>
        <div class="input-group">
          <label>
            Scale:
            <input type="range" v-model="settings.pixelate.scale" min="1" max="20" step="1" />
            <span>{{ settings.pixelate.scale }}%</span>
          </label>
          <label>
            Colors:
            <input type="range" v-model="settings.pixelate.colors" min="2" max="256" step="2" />
            <span>{{ settings.pixelate.colors }}</span>
          </label>
        </div>
        <div class="button-row">
          <button class="reset-button" @click="resetEffect('pixelate')">Reset</button>
          <button @click="sendCommand('pixelate_wallpaper', { ...settings.pixelate })">Apply</button>
        </div>
      </div>

      <!-- Blur Effect Controls -->
      <div class="effect-control">
        <h3>Blur</h3>
        <div class="input-group">
          <label>
            Radius:
            <input type="range" v-model="settings.blur.radius" min="0" max="100" step="5" />
            <span>{{ settings.blur.radius }}</span>
          </label>
        </div>
        <div class="button-row">
          <button class="reset-button" @click="resetEffect('blur')">Reset</button>
          <button @click="sendCommand('blur_wallpaper', { ...settings.blur })">Apply</button>
        </div>
      </div>

      <!-- Darkening Effect Controls -->
      <div class="effect-control no-bottom-margin">
        <h3>Darken</h3>
        <div class="input-group no-gap">
          <div class="darken-icons-container">
            <div></div>
            <span>🌙</span>
            <div></div>
            <div></div>
            <span>🔆</span>
            <div></div>
          </div>
          <label>
            Amount:
            <input type="range" v-model="settings.darken.amount" min="0" max="100" step="5" />
            <span>{{ settings.darken.amount }}%</span>
          </label>
        </div>
        <div class="button-row">
          <button class="reset-button" @click="resetEffect('darken')">Reset</button>
          <button @click="sendCommand('darken_wallpaper', { ...settings.darken })">Apply</button>
        </div>
      </div>
    </section>

    <!-- Utility Controls -->
    <section class="control-section no-bottom-margin">
      <h2>Miscellaneous</h2>
      <div class="button-group">
        <button @click="sendCommand('revert_wallpaper')">Revert Modifications</button>
        <button @click="sendCommand('set_black_wallpaper')">Set Black Wallpaper</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
}

h2 {
  margin-bottom: 20px;
  margin-top: 0px;
  font-size: 1.5em;
}

h3 {
  margin-top: 0px;
  margin-bottom: 15px;
  font-size: 1.2em;
}

/* Card-style sections for grouping controls */
.control-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 15px;
}

.no-bottom-margin {
  margin-bottom: 0 !important;
}

/* Flexible button layouts */
.button-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

.button-row {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Individual effect control containers */
.effect-control {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.darken-icons-container {
  display: flex;
  justify-content: space-between;
  margin-top: -10px;
}

/* Input styling and layout */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 15px;
}

.no-gap {
  gap: 0;
}

label {
  display: flex;
  align-items: center;
}

input[type="range"] {
  flex: 1;
  min-width: 150px;
}

span {
  min-width: 50px;
}

/* Button styling */
button {
  background-color: #2a2a2a;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

button:hover {
  background-color: #3a3a3a;
  border-color: rgba(255, 255, 255, 0.2);
}

.reset-button {
  background-color: #3f3f3f;
}

.reset-button:hover {
  background-color: #4f4f4f;
}

/* Light mode styles */
@media (prefers-color-scheme: light) {
  .control-section {
    background: rgba(0, 0, 0, 0.05);
  }

  .effect-control {
    border-color: rgba(0, 0, 0, 0.1);
  }

  button {
    background-color: #f0f0f0;
    color: #000;
    border-color: rgba(0, 0, 0, 0.1);
  }

  button:hover {
    background-color: #e0e0e0;
    border-color: rgba(0, 0, 0, 0.2);
  }

  .reset-button {
    background-color: #c5c5c5;
  }

  .reset-button:hover {
    background-color: #e0e0e0;
  }
}
</style>
