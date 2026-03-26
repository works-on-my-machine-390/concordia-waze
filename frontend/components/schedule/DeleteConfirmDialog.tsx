import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CloseIcon } from "@/app/icons";
import { COLORS } from "@/app/constants";

type Props = {
  visible: boolean;
  courseName?: string;
  isPending?: boolean;
  onCancel: () => void;
  onDelete: () => void;
};

export default function DeleteConfirmDialog({
  visible,
  courseName,
  isPending = false,
  onCancel,
  onDelete,
}: Readonly<Props>) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onCancel}>
        <View style={s.card}>
          <TouchableOpacity
            style={s.x}
            onPress={onCancel}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <CloseIcon size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <Text style={s.title}>Delete Class?</Text>
          {!!courseName && <Text style={s.sub}>{courseName}</Text>}
          <Text style={s.body}>This action cannot be undone.</Text>

          <TouchableOpacity
            style={[s.btn, isPending && s.dim]}
            onPress={onDelete}
            disabled={isPending}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.btnTxt}>Delete</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.50)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    alignItems: "center",
  },
  x: { position: "absolute", top: 14, right: 16, zIndex: 10 },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 4,
    textAlign: "center",
  },
  sub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 2, textAlign: "center" },
  body: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: COLORS.maroon,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  btnTxt: { color: COLORS.surface, fontSize: 15, fontWeight: "700" },
  dim: { opacity: 0.55 },
});