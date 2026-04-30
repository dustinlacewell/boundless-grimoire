import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MAX_CARD_WIDTH } from "../search/gridSizeStore";
import { useSettingsStore } from "../settings/settingsStore";
import { colors } from "@boundless-grimoire/ui";
import {
	useCardPreviewStore,
	mousePos,
	hideCardPreview,
} from "./cardPreviewStore";
import { imageUrl } from "./imageUrl";
import { ManaCost } from "./ManaCost";
import { OracleText } from "./OracleText";
import { RarityIcon } from "../filters/icons/RarityIcon";
import { cardHeightFor, CARD_ASPECT } from "./CardImage";
import type { ScryfallCardFace } from "../scryfall/types";
import type { CardSnapshot } from "../storage/types";

// Card preview renders the image at the deck's max-zoom width so a hover
// peek is as big as the largest tile the user can possibly see elsewhere.
const IMAGE_W = MAX_CARD_WIDTH;
const IMAGE_H = Math.round(IMAGE_W / CARD_ASPECT);
const SIDE_W = 300;
const PANEL_H = IMAGE_H;
const OFFSET = 18;

const wrapStyle: React.CSSProperties = {
	position: "fixed",
	top: 0,
	left: 0,
	zIndex: 2147483647,
	background: colors.accent,
	border: `1px solid ${colors.borderStrong}`,
	borderRadius: 10,
	boxShadow: "0 12px 36px rgba(0,0,0,0.7)",
	display: "flex",
	gap: 2,
	overflow: "hidden",
	pointerEvents: "none",
	fontFamily: "system-ui, sans-serif",
	color: colors.text,
};

const sideStyle: React.CSSProperties = {
	width: SIDE_W,
	padding: 12,
	display: "flex",
	flexDirection: "column",
	gap: 0,
	boxSizing: "border-box",
	overflow: "hidden",
	background: colors.bg1,
};

const rowStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 8,
};

const dividerStyle: React.CSSProperties = {
	borderBottom: `1px solid ${colors.border}`,
	marginBottom: 6,
	paddingBottom: 6,
};

const nameStyle: React.CSSProperties = {
	fontSize: 15,
	fontWeight: 700,
	lineHeight: 1.25,
	flex: 1,
	minWidth: 0,
};

const typeStyle: React.CSSProperties = {
	fontSize: 12,
	fontWeight: 600,
	color: colors.textMuted,
	flex: 1,
	minWidth: 0,
};

const oracleBlockStyle: React.CSSProperties = {
	fontSize: 12.5,
	lineHeight: 1.5,
	overflow: "auto",
	flex: 1,
	color: colors.text,
	padding: "6px 0",
};

const setLineStyle: React.CSSProperties = {
	fontSize: 11,
	color: colors.textFaint,
	flex: 1,
	minWidth: 0,
};

const ptStyle: React.CSSProperties = {
	fontSize: 13,
	fontWeight: 800,
	letterSpacing: 0.4,
	padding: "1px 8px",
	borderRadius: 4,
	background: colors.bg3,
	border: `1px solid ${colors.borderStrong}`,
};

/** Compute the panel's position so it stays inside the viewport. */
function computePosition(
	mx: number,
	my: number,
	pw: number,
	ph: number,
): { x: number; y: number } {
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	let x = mx + OFFSET;
	let y = my + OFFSET;
	if (x + pw > vw - 8) x = mx - pw - OFFSET;
	if (y + ph > vh - 8) y = vh - ph - 8;
	if (y < 8) y = 8;
	if (x < 8) x = 8;
	return { x, y };
}

const PRINT_W = 360;
const PRINT_H = cardHeightFor(PRINT_W);
const LABEL_H = 36;

const printWrapStyle: React.CSSProperties = {
	position: "fixed",
	top: 0,
	left: 0,
	zIndex: 2147483647,
	background: colors.bg1,
	border: `1px solid ${colors.borderStrong}`,
	borderRadius: 10,
	boxShadow: "0 12px 36px rgba(0,0,0,0.7)",
	overflow: "hidden",
	pointerEvents: "none",
	fontFamily: "system-ui, sans-serif",
	color: colors.text,
};

const printLabelStyle: React.CSSProperties = {
	height: LABEL_H,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	fontSize: 12,
	fontWeight: 600,
	color: colors.textMuted,
	padding: "0 8px",
	textAlign: "center",
	lineHeight: 1.3,
};

function ImagePreview({
	snapshot,
	face,
	faceIndex,
	imageHeight = IMAGE_H,
	imageWidth = IMAGE_W,
}: {
	snapshot: CardSnapshot;
	face?: ScryfallCardFace;
	faceIndex?: number;
	imageHeight?: number;
	imageWidth?: number;
}) {
	const url =
		imageUrl(snapshot, "normal", faceIndex) ??
		imageUrl(snapshot, "large", faceIndex) ??
		null;
	const name = face?.name ?? snapshot.name ?? "Card image";

	return (
		url && (
			<div
				style={{
					height: imageHeight,
					width: imageWidth,
					flex: "0 0 auto",
					background: colors.bg0,
					borderRadius: "10px",
					overflow: "hidden",
				}}
			>
				<img
					src={url}
					alt={name}
					draggable={false}
					style={{
						width: "100%",
						height: "100%",
						display: "block",
						objectFit: "cover",
						scale: "1.02",
					}}
				/>
			</div>
		)
	);
}

function TextPreview({
	snapshot,
	face,
}: {
	snapshot: CardSnapshot;
	face?: ScryfallCardFace;
}) {
	const loyalty = face?.loyalty ?? snapshot.loyalty;
	const manaCost = face?.mana_cost ?? snapshot.mana_cost;
	const name = face?.name ?? snapshot.name;
	const oracleText = face?.oracle_text ?? snapshot.oracle_text;
	const power = face?.power ?? snapshot.power;
	const toughness = face?.toughness ?? snapshot.toughness;
	const typeLine = face?.type_line ?? snapshot.type_line;

	console.log(
		"Rendering TextPreview for",
		snapshot.name,
		"with face",
		face?.name,
	);
	console.log(snapshot);
	console.log(face);

	return (
		<>
			{/* title · cost */}
			<div style={{ ...rowStyle, ...dividerStyle }}>
				<div style={nameStyle}>{name}</div>
				{manaCost && <ManaCost cost={manaCost} size={15} />}
			</div>

			{/* type -- subtype */}
			<div style={{ ...rowStyle, ...dividerStyle }}>
				<div style={typeStyle}>{typeLine ?? ""}</div>
			</div>

			{/* oracle text */}
			{oracleText && (
				<div style={oracleBlockStyle}>
					<OracleText text={oracleText} />
				</div>
			)}

			{/* set info · pow/tou */}
			<div
				style={{
					...rowStyle,
					borderTop: `1px solid ${colors.border}`,
					paddingTop: 6,
					marginTop: "auto",
				}}
			>
				<div style={setLineStyle}>
					{snapshot.set_name ?? "—"}
					{snapshot.set ? ` (${snapshot.set.toUpperCase()})` : ""}
					{snapshot.collector_number ? ` #${snapshot.collector_number}` : ""}
				</div>
				{(power !== undefined || loyalty !== undefined) && (
					<div style={ptStyle}>
						{loyalty !== undefined ? `${loyalty}` : `${power}/${toughness}`}
					</div>
				)}{" "}
				{snapshot.rarity &&
					["common", "uncommon", "rare", "mythic"].includes(
						snapshot.rarity,
					) && (
						<RarityIcon
							rarity={
								snapshot.rarity as "common" | "uncommon" | "rare" | "mythic"
							}
							size={18}
						/>
					)}
			</div>
		</>
	);
}

function PreviewCard({
	snapshot,
	face,
	faceIndex,
	previewMode,
	isMultiface,
}: {
	snapshot: CardSnapshot;
	previewMode: string;
	face?: ScryfallCardFace;
	faceIndex?: number;
	isMultiface?: boolean;
}) {
	const showImage = previewMode !== "text";
	const showText = previewMode !== "image";

	// Round only the outer corners based on which half is visible.
	const imageRadius = showText ? "10px 0 0 10px" : "10px";
	const textRadius = showImage ? "0 10px 10px 0" : "10px";

	let text = null;

	if (showText) {
		if (!face && isMultiface) {
			const faces = snapshot.card_faces ?? [];
			const previews = faces.map((face, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: keys are stable here since card_faces order is semantically meaningful and stable
				<TextPreview key={i} snapshot={snapshot} face={face} />
			));

			text = (
				<div
					style={{
						...sideStyle,
						display: "flex",
						flexDirection: "column",
					}}
				>
					{previews.reduce((acc, face) => (
						<>
							{acc}
							<hr style={{ margin: "10px 0" }} />
							{face}
						</>
					))}
				</div>
			);
		} else {
			text = (
				<div style={{ ...sideStyle, borderRadius: textRadius }}>
					<TextPreview snapshot={snapshot} face={face} />
				</div>
			);
		}
	}
	return (
		<div style={{ display: "flex", flexDirection: "row", height: "100%" }}>
			{showImage ? (
				<div
					style={{
						flex: "0 0 auto",
						background: colors.bg0,
						borderRadius: imageRadius,
						overflow: "hidden",
					}}
				>
					<ImagePreview snapshot={snapshot} face={face} faceIndex={faceIndex} />
				</div>
			) : null}
			{text}
		</div>
	);
}

/**
 * Floating card preview that follows the mouse while Ctrl is held over
 * a card. Mounted into document.body via portal so no overflow ancestor
 * can clip it. Position updates happen via direct DOM transform writes
 * so mousemove doesn't thrash React state.
 */
export function CardPreview() {
	const snapshot = useCardPreviewStore((s) => s.snapshot);
	const printMode = useCardPreviewStore((s) => s.printMode);
	const previewMode = useSettingsStore((s) => s.settings.previewMode);
	const ref = useRef<HTMLDivElement>(null);

	const showImage = previewMode !== "text";
	const showText = previewMode !== "image";

	const faceCount = snapshot?.card_faces?.length ?? 1;

	// Panel width: image-only / text-only shrinks; both is the full width.
	const fullPanelW = (showImage ? IMAGE_W : 0) + (showText ? SIDE_W : 0);
	const panelW = printMode ? PRINT_W * faceCount : fullPanelW;
	const panelH = printMode ? PRINT_H + LABEL_H : PANEL_H * faceCount;

	// Position the panel imperatively on every mousemove while open. Also
	// hide the preview if Ctrl is released without a fresh keydown.
	useEffect(() => {
		if (!snapshot) return;
		const apply = () => {
			const node = ref.current;
			if (!node) return;
			const { x, y } = computePosition(mousePos.x, mousePos.y, panelW, panelH);
			node.style.transform = `translate(${x}px, ${y}px)`;
		};
		apply();
		const onMove = (e: MouseEvent) => {
			mousePos.x = e.clientX;
			mousePos.y = e.clientY;
			if (!e.ctrlKey) {
				hideCardPreview();
				return;
			}
			apply();
		};
		// Dismiss on any keyup where Ctrl is no longer held. Using ctrlKey
		// rather than `key === "Control"` catches the release reliably even
		// across platform/layout quirks, and capture phase runs before any
		// page listener that might stop propagation.
		const onKeyUp = (e: KeyboardEvent) => {
			if (!e.ctrlKey) hideCardPreview();
		};
		// If focus leaves the window while Ctrl is held, we never see a
		// keyup — make sure the preview doesn't get stuck.
		const onBlur = () => hideCardPreview();
		window.addEventListener("mousemove", onMove);
		window.addEventListener("keyup", onKeyUp, true);
		window.addEventListener("blur", onBlur);
		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("keyup", onKeyUp, true);
			window.removeEventListener("blur", onBlur);
		};
	}, [snapshot, panelW, panelH]);

	// Initial position before the first mousemove.
	useLayoutEffect(() => {
		if (!snapshot || !ref.current) return;
		const { x, y } = computePosition(mousePos.x, mousePos.y, panelW, panelH);
		ref.current.style.transform = `translate(${x}px, ${y}px)`;
	}, [snapshot, panelW, panelH]);

	if (!snapshot) return null;

	const isMultiface =
		typeof snapshot.card_faces !== "undefined" &&
		snapshot.card_faces.length !== 0;

	// MFCs: no root image_uris, each face has its own.
	const isMultiimage = !snapshot.image_uris && isMultiface;

	if (printMode) {
		const setLabel = [
			snapshot.set_name ?? snapshot.set?.toUpperCase() ?? "—",
			snapshot.collector_number ? `#${snapshot.collector_number}` : null,
		]
			.filter(Boolean)
			.join(" · ");

		return createPortal(
			<div ref={ref} style={{ ...printWrapStyle }}>
				{isMultiimage ? (
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							justifyContent: "center",
							alignItems: "center",
							gap: 12,
						}}
					>
						{
							// biome-ignore lint/style/noNonNullAssertion: type guarded by isMfc
							snapshot.card_faces!.map((face, i) => (
								<ImagePreview
									// biome-ignore lint/suspicious/noArrayIndexKey: keys are stable here since card_faces order is semantically meaningful and stable
									key={i}
									snapshot={snapshot}
									face={face}
									faceIndex={i}
									imageHeight={PRINT_H}
									imageWidth={PRINT_W}
								/>
							))
						}
					</div>
				) : (
					<ImagePreview snapshot={snapshot} />
				)}
				<div style={printLabelStyle}>{setLabel}</div>
			</div>,
			document.getElementById("boundless-grimoire-root") ?? document.body,
		);
	}

	return createPortal(
		<div ref={ref} style={wrapStyle}>
			{isMultiimage ? (
				<div
					style={{ display: "flex", flexDirection: "column", height: "100%" }}
				>
					{
						// biome-ignore lint/style/noNonNullAssertion: type guarded by isMfc
						snapshot.card_faces!.map((face, i) => {
							return (
								<PreviewCard
									// biome-ignore lint/suspicious/noArrayIndexKey: keys are stable here since card_faces order is semantically meaningful and stable
									key={i}
									snapshot={snapshot}
									face={face}
									faceIndex={i}
									previewMode={previewMode}
								/>
							);
						})
					}
				</div>
			) : (
				<PreviewCard
					snapshot={snapshot}
					previewMode={previewMode}
					isMultiface={isMultiface}
				/>
			)}
		</div>,
		document.getElementById("boundless-grimoire-root") ?? document.body,
	);
}
