#!/usr/bin/env bash
#
# Moves stray files into the layout server.js expects, and repairs
# filename-case mismatches between links and files on disk.
#
#   public/     everything served over HTTP
#   public/js/  client-side JS
#   scripts/    build + audit tooling
#   root        server.js, package.json, config only
#
# Safe to re-run. Never overwrites a differing file; conflicts are reported.

set -euo pipefail
cd "$(dirname "$0")"

mkdir -p public/js scripts

moved=0
skipped=()
empty=()
renamed=()

move() { # move <file> <destdir>
  local src="$1" dest="$2" base
  [ -e "$src" ] || return 0
  base="$(basename "$src")"

  if [ ! -s "$src" ]; then
    empty+=("$src")
    return 0
  fi

  if [ -e "$dest/$base" ]; then
    if cmp -s "$src" "$dest/$base"; then
      rm "$src"
      echo "  dedup    $src"
    else
      skipped+=("$src -> $dest/ (differs)")
    fi
    return 0
  fi

  mv "$src" "$dest/"
  echo "  moved    $src -> $dest/"
  moved=$((moved + 1))
}

echo "Reorganising..."

# --- web assets -> public/
for f in *.html *.png *.jpg *.jpeg *.svg *.ico *.glb *.webmanifest *.webp; do
  [ -e "$f" ] || continue
  move "$f" public
done

# --- stylesheets -> public/css/
# Pages reference these as /css/<name>.css, so they must NOT land in public/
# root. This is why a stray banner.css in the project root 404s even after the
# rest of the tree is correct.
mkdir -p public/css
for f in *.css public/*.css; do
  [ -e "$f" ] || continue
  move "$f" public/css
done

# --- tooling -> scripts/  (server.js stays at root; it IS the entry point)
for f in check-links.js package.js; do
  move "$f" scripts
done

# --- client-side JS -> public/js/  (pages reference /js/contact-card.js)
# Banner animation modules live one level deeper because banner-carousel.js
# imports them as "./banners/<name>.js".
mkdir -p public/js/banners
for f in canvas-util.js followers.js nexus.js neuron.js \
         public/canvas-util.js public/followers.js public/nexus.js public/neuron.js \
         public/js/canvas-util.js public/js/followers.js public/js/nexus.js public/js/neuron.js; do
  [ -e "$f" ] || continue
  move "$f" public/js/banners
done

# Only files known to be client-side get published. A blanket `*.js` sweep
# would push any stray script in the project root onto the public web, which
# is how private tooling gets leaked. Unknown files are reported, not moved.
for f in contact-card.js banner-carousel.js \
         public/contact-card.js public/banner-carousel.js; do
  [ -e "$f" ] || continue
  move "$f" public/js
done

for f in *.js; do
  [ -e "$f" ] || continue
  case "$(basename "$f")" in
    server.js|check-links.js|package.js|doctor.js|ports.js) continue ;;
  esac
  skipped+=("$f left in root — not a known client-side file. Move it to")
  skipped+=("    public/js/ yourself if it belongs on the web, or into scripts/.")
done

# --- fix double extension
if [ -s "public/gridfav-apple.png.png" ]; then
  mv -n "public/gridfav-apple.png.png" "public/gridfav-apple.png"
  renamed+=("gridfav-apple.png.png -> gridfav-apple.png")
fi

# ---------------------------------------------------------------------------
# CASE REPAIR
# Linux and Cloudflare are case-sensitive; macOS and Windows are not. A file
# saved as dashboards.html but linked as Dashboards.html works on your laptop
# and 404s the moment it deploys. Rename the file to match what pages link to.
# ---------------------------------------------------------------------------
echo
echo "Checking filename case against links..."

linked=$(grep -ohE 'href="[A-Za-z0-9_.-]+\.html"' public/*.html 2>/dev/null \
  | sed -E 's/href="//; s/"//' | sort -u)

for want in $linked; do
  [ -e "public/$want" ] && continue
  have=$(ls public 2>/dev/null | grep -ix "$want" | head -1 || true)
  if [ -n "$have" ] && [ "$have" != "$want" ]; then
    mv "public/$have" "public/$want"
    renamed+=("$have -> $want  (case mismatch)")
    echo "  renamed  public/$have -> public/$want"
  fi
done

echo
echo "Moved $moved file(s)."

if [ ${#renamed[@]} -gt 0 ]; then
  echo
  echo "RENAMED:"
  printf '  %s\n' "${renamed[@]}"
fi

if [ ${#empty[@]} -gt 0 ]; then
  echo
  echo "EMPTY (0 bytes) — left in place, these are broken:"
  printf '  %s\n' "${empty[@]}"
  echo "  Re-export or delete them. An empty PNG renders as a broken image."
fi

if [ ${#skipped[@]} -gt 0 ]; then
  echo
  echo "CONFLICTS — destination has a DIFFERENT file of the same name:"
  printf '  %s\n' "${skipped[@]}"
fi

echo
echo "Verifying..."
if [ -f scripts/check-links.js ]; then
  node scripts/check-links.js || true
fi
