import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.net.Socket;
import java.net.UnknownHostException;

public class TCPClient {
  public static void main(String args[]) {
    Socket s = null;
    try {
      int serverPort = 7896;
      s = new Socket(args[1], serverPort);
      DataInputStream in = new DataInputStream(s.getInputStream());
      DataOutputStream out = new DataOutputStream(s.getOutputStream());
      for (int i = 0; i < 3; i++) {
        out.writeUTF(args[0] + " " + i);
        String data = in.readUTF(); // � uma linha do fluxo de dados
        System.out.println("Recebido: " + data);
      }
    } catch (UnknownHostException e) {
      System.out.println("Socket:" + e.getMessage());
    } catch (EOFException e) {
      System.out.println("EOF:" + e.getMessage());
    } catch (IOException e) {
      System.out.println("readline:" + e.getMessage());
    } finally {
      if (s != null)
        try {
          s.close();
        } catch (IOException e) {
          System.out.println("close:" + e.getMessage());
        }
    }
  }
}
